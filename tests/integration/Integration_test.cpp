#include "gtest/gtest.h"

#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <memory>
#include <optional>
#include <set>
#include <sstream>
#include <string>
#include <vector>

#include "CommandParser.h"
#include "CommandExecutor.h"
#include "AddCommand.h"
#include "GetCommand.h"
#include "SearchCommand.h"
#include "LocalFileManagement.h"
#include "RLECompressor.h"

namespace fs = std::filesystem;

// Helper: create clean OVERDRIVE_PATH and return its absolute path
static fs::path prepareTestDir(const std::string &name) {
	fs::path base = fs::temp_directory_path() / (std::string("overdrive_it_") + name);
	std::error_code ec;
	fs::remove_all(base, ec);
	fs::create_directories(base, ec);
	setenv("OVERDRIVE_PATH", base.string().c_str(), 1);
	return base;
}

// Helper: build an executor with real commands bound to a shared file manager
static std::unique_ptr<IExecutor> buildExecutor(const std::shared_ptr<IFileManagement> &fm) {
	std::map<std::string, std::unique_ptr<ICommand>> commands;
	commands["add"] = std::make_unique<AddCommand>(fm);
	commands["get"] = std::make_unique<GetCommand>(fm);
	commands["search"] = std::make_unique<SearchCommand>(fm);
	return std::make_unique<CommandExecutor>(std::move(commands));
}

// Helper: read a whole file as binary string
static std::string readFileBinary(const fs::path &p) {
	std::ifstream in(p, std::ios::binary);
	std::ostringstream ss;
	ss << in.rdbuf();
	return ss.str();
}

// 1. Integration Test – add creates compressed file
TEST(Integration, Add_CreatesCompressedFile) {
	auto base = prepareTestDir("add");

	auto fm = std::make_shared<LocalFileManagement>(std::make_unique<RLECompressor>());
	auto exec = buildExecutor(fm);
	CommandParser parser;

	auto pc = parser.parse("add fileA HelloWorld");
	auto out = exec->execute(pc.name, pc.args);
	ASSERT_FALSE(out.has_value());

	// Verify file exists and content is compressed RLE
	fs::path filePath = base / "fileA";
	ASSERT_TRUE(fs::exists(filePath));

	std::string raw = readFileBinary(filePath);
	RLECompressor rle;
	std::string expected = rle.compress("HelloWorld");
	EXPECT_EQ(raw, expected);
}

// 2. Integration Test – get returns original text from RLE
TEST(Integration, Get_ReturnsOriginalText) {
	prepareTestDir("get");

	auto fm = std::make_shared<LocalFileManagement>(std::make_unique<RLECompressor>());
	auto exec = buildExecutor(fm);
	CommandParser parser;

	// Create via add
	auto addPc = parser.parse("add fileA HelloWorld");
	ASSERT_FALSE(exec->execute(addPc.name, addPc.args).has_value());

	// Now get
	auto getPc = parser.parse("get fileA");
	auto out = exec->execute(getPc.name, getPc.args);
	ASSERT_TRUE(out.has_value());
	EXPECT_EQ(out.value(), "HelloWorld");
}

// 3. Integration Test – search finds files containing text
TEST(Integration, Search_FindsMatchingFiles) {
	prepareTestDir("search");

	auto fm = std::make_shared<LocalFileManagement>(std::make_unique<RLECompressor>());
	auto exec = buildExecutor(fm);
	CommandParser parser;

	// Create three files
	ASSERT_FALSE(exec->execute(parser.parse("add file1 banana").name,
							   parser.parse("add file1 banana").args)
					 .has_value());
	ASSERT_FALSE(exec->execute(parser.parse("add file2 band").name,
							   parser.parse("add file2 band").args)
					 .has_value());
	ASSERT_FALSE(exec->execute(parser.parse("add file3 apple").name,
							   parser.parse("add file3 apple").args)
					 .has_value());

	auto pc = parser.parse("search ban");
	auto out = exec->execute(pc.name, pc.args);

	ASSERT_TRUE(out.has_value());
	// Order is not guaranteed; compare as set
	std::istringstream iss(out.value());
	std::set<std::string> got{std::istream_iterator<std::string>{iss}, std::istream_iterator<std::string>{}};
	std::set<std::string> expected{"file1", "file2"};
	EXPECT_EQ(got, expected);
}

// 4. Integration Test – add on existing file is illegal and keeps original content
TEST(Integration, Add_OnExistingFile_IsIllegalAndKeepsOriginal) {
	prepareTestDir("add_existing");

	auto fm = std::make_shared<LocalFileManagement>(std::make_unique<RLECompressor>());
	auto exec = buildExecutor(fm);
	CommandParser parser;

	// First add
	auto pc1 = parser.parse("add fileA AAAA");
	ASSERT_FALSE(exec->execute(pc1.name, pc1.args).has_value());

	// Second add on same file should throw (create on existing)
	auto pc2 = parser.parse("add fileA BBBB");
	EXPECT_THROW({ exec->execute(pc2.name, pc2.args); }, std::runtime_error);

	// Ensure content is still the first payload
	auto getPc = parser.parse("get fileA");
	auto out = exec->execute(getPc.name, getPc.args);
	ASSERT_TRUE(out.has_value());
	EXPECT_EQ(out.value(), "AAAA");
}

// 5. Integration Test – get on missing file returns no output but no crash
TEST(Integration, Get_OnMissingFile_NoOutputNoCrash) {
	prepareTestDir("get_missing");

	auto fm = std::make_shared<LocalFileManagement>(std::make_unique<RLECompressor>());
	auto exec = buildExecutor(fm);
	CommandParser parser;

	auto pc = parser.parse("get notExist");
	auto out = exec->execute(pc.name, pc.args);
	EXPECT_FALSE(out.has_value());

	// System continues: add should still work
	auto addPc = parser.parse("add file1 ABC");
	EXPECT_FALSE(exec->execute(addPc.name, addPc.args).has_value());
}

// 6. Integration Test – unknown command followed by valid commands
TEST(Integration, UnknownCommand_ThenValidCommandsWork) {
	prepareTestDir("unknown_cmd");

	auto fm = std::make_shared<LocalFileManagement>(std::make_unique<RLECompressor>());
	auto exec = buildExecutor(fm);
	CommandParser parser;

	// Unknown command should throw invalid_argument
	auto bad = parser.parse("foo test hello");
	EXPECT_THROW({ exec->execute(bad.name, bad.args); }, std::invalid_argument);

	// Then a valid add should work
	auto addPc = parser.parse("add file1 ABC");
	EXPECT_FALSE(exec->execute(addPc.name, addPc.args).has_value());

	// And search for non-existing should return no output
	auto searchPc = parser.parse("search nope");
	auto out = exec->execute(searchPc.name, searchPc.args);
	EXPECT_FALSE(out.has_value());
}

