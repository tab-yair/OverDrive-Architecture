#include <gtest/gtest.h>
#include "file/compressor/RLECompressor.h"

// ---------------- HELPER FUNCTION ----------------
// Helper function to test round-trip compression and decompression
void testRLERoundTrip(const std::string& input) {
    RLECompressor rle;
    std::string compressed = rle.compress(input);
    std::string decompressed = rle.decompress(compressed);
    EXPECT_EQ(decompressed, input);
}

// Helper to build expected compressed format: [char][0xFF][count]
std::string buildCompressed(const std::vector<std::pair<char, unsigned char>>& runs) {
    std::string result;
    for (const auto& [ch, count] : runs) {
        result += ch;
        result += static_cast<char>(0xFF);  // DELIMITER
        result += static_cast<char>(count);
    }
    return result;
}

// ========================================
// 1. BASIC COMPRESSION TESTS
// ========================================

// Empty string
TEST(RLECompressionTest, EmptyString) {
    testRLERoundTrip("");
}

// Single character
TEST(RLECompressionTest, SingleCharacter) {
    testRLERoundTrip("A");
}

// Basic repeated characters
TEST(RLECompressionTest, BasicEncodingDecoding) {
    testRLERoundTrip("AAAABBBCCDAA");
}

// All unique characters (no repetition)
TEST(RLECompressionTest, AllUniqueCharacters) {
    testRLERoundTrip("ABCDEFG");
}

// Alternating characters (worst case - no compression benefit)
TEST(RLECompressionTest, AlternatingCharactersWorstCase) {
    std::string input = "ABABABABAB";
    RLECompressor rle;
    std::string compressed = rle.compress(input);
    
    // Each char appears once, so compressed size = input.size() * 3 (larger!)
    EXPECT_GT(compressed.size(), input.size());
    
    testRLERoundTrip(input);
}

// ========================================
// 2. RUN LENGTH BOUNDARY TESTS
// ========================================

// Long repeated sequence (50 chars)
TEST(RLECompressionTest, LongRepeatedSequence) {
    testRLERoundTrip(std::string(50, 'X'));
}

// Maximum run length (255 - boundary)
TEST(RLECompressionTest, MaximumRunLength255) {
    std::string input(255, 'M');  // Exactly 255
    RLECompressor rle;
    std::string compressed = rle.compress(input);
    
    // Should be single run of 255
    std::string expected = buildCompressed({{'M', 255}});
    EXPECT_EQ(compressed, expected);
    EXPECT_EQ(compressed.size(), 3u);  // 1 char + 1 delimiter + 1 count
    
    testRLERoundTrip(input);
}

// Just above maximum (256) - should split into two runs
TEST(RLECompressionTest, JustAboveMaximum256) {
    std::string input(256, 'N');
    RLECompressor rle;
    std::string compressed = rle.compress(input);
    
    // Should be: 255 + 1
    std::string expected = buildCompressed({{'N', 255}, {'N', 1}});
    EXPECT_EQ(compressed, expected);
    EXPECT_EQ(compressed.size(), 6u);  // 2 runs × 3 bytes
    
    testRLERoundTrip(input);
}

// Very long sequence (>255) gets split into multiple runs
TEST(RLECompressionTest, VeryLongSequenceSplits) {
    std::string input(300, 'Z');  // 300 Z's
    RLECompressor rle;
    std::string compressed = rle.compress(input);
    
    // Should be split into: 255 + 45
    std::string expected = buildCompressed({{'Z', 255}, {'Z', 45}});
    EXPECT_EQ(compressed, expected);
    
    std::string decompressed = rle.decompress(compressed);
    EXPECT_EQ(decompressed, input);
}

// ========================================
// 3. SPECIAL CHARACTER SUPPORT (NEW!)
// ========================================

// Digits (now supported with binary format!)
TEST(RLECompressionTest, StringWithDigits) {
    testRLERoundTrip("AAA333BBB");
}

// Repeated digits
TEST(RLECompressionTest, RepeatedDigits) {
    testRLERoundTrip("0000111122223333444455556666777788889999");
}

// String that looks like old compressed format
TEST(RLECompressionTest, StringLookingLikeOldFormat) {
    testRLERoundTrip("A3B2C1");  // Now treated as literal characters
}

// Special characters and punctuation
TEST(RLECompressionTest, SpecialCharactersAndPunctuation) {
    testRLERoundTrip("!!!@@@###$$$%%%^^^&&&***");
}

// Mixed letters, digits, and symbols
TEST(RLECompressionTest, MixedLettersDigitsSymbols) {
    testRLERoundTrip("ABC123xyz789!@#");
}

// Whitespace and control characters
TEST(RLECompressionTest, WhitespaceAndControlCharacters) {
    testRLERoundTrip("AA \t\nBB");
}

// Tab, newline, carriage return
TEST(RLECompressionTest, ControlCharactersTabs) {
    testRLERoundTrip("\t\t\t\n\n\r\r\rXXX");
}

// Null bytes (0x00)
TEST(RLECompressionTest, StringWithNullBytes) {
    std::string withNull = "AAA";
    withNull += '\0';
    withNull += '\0';
    withNull += "BBB";
    testRLERoundTrip(withNull);
}

// All ASCII characters (0-127)
TEST(RLECompressionTest, AllASCIICharacters) {
    std::string allAscii;
    for (int i = 0; i < 128; i++) {
        allAscii += static_cast<char>(i);
    }
    testRLERoundTrip(allAscii);
}

// ========================================
// 4. INVALID INPUT / ERROR HANDLING TESTS
// ========================================

// Decompress rejects malformed compressed strings
TEST(RLECompressionInvalidInput, DecompressRejectsMalformedCompressedStrings) {
    RLECompressor rle;
    
    // Count = 0 is invalid
    std::string invalidZeroCount = buildCompressed({{'A', 0}});
    EXPECT_THROW(rle.decompress(invalidZeroCount), std::invalid_argument);
    
    // Missing delimiter
    std::string missingDelimiter = "AB";  // No delimiter between char and count
    EXPECT_THROW(rle.decompress(missingDelimiter), std::invalid_argument);
    
    // Incomplete data (only 2 bytes instead of 3)
    std::string incompleteData;
    incompleteData += 'A';
    incompleteData += static_cast<char>(0xFF);
    // Missing count byte
    EXPECT_THROW(rle.decompress(incompleteData), std::invalid_argument);
    
    // Incomplete data (only char, no delimiter or count)
    EXPECT_THROW(rle.decompress("A"), std::invalid_argument);
    
    // Wrong delimiter
    std::string wrongDelimiter = "A\xFE\x03";  // Using 0xFE instead of 0xFF
    EXPECT_THROW(rle.decompress(wrongDelimiter), std::invalid_argument);
}

