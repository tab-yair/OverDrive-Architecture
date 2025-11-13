#include <gtest/gtest.h>
#include "RLECompressor.h"

// Helper function to test compression and decompression
void testRLECase(const std::string& input, const std::string& expectedCompressed) {
    RLECompressor rle;
    std::string compressed = rle.compress(input);
    EXPECT_EQ(compressed, expectedCompressed);

    std::string decompressed = rle.decompress(compressed);
    EXPECT_EQ(decompressed, input);
}

// ---------------- TESTS ----------------

// Test basic RLE encoding and decoding with repeated characters
TEST(RLECompressionTest, BasicEncodingDecoding) {
    testRLECase("AAAABBBCCDAA", "A4B3C2D1A2");
}

// Test encoding and decoding of an empty string
TEST(RLECompressionTest, EmptyString) {
    testRLECase("", "");
}

// Test encoding and decoding of a single character string
TEST(RLECompressionTest, SingleCharacter) {
    testRLECase("A", "A1");
}

// Test encoding and decoding of a string with all unique characters
TEST(RLECompressionTest, AllUniqueCharacters) {
    testRLECase("ABCDEFG", "A1B1C1D1E1F1G1");
}

// Test encoding and decoding of a long repeated sequence
TEST(RLECompressionTest, LongRepeatedSequence) {
    testRLECase(std::string(50, 'X'), "X50"); // 50 times 'X'
}

// Test encoding and decoding of a string with whitespace and control characters (space, tab, newline)
TEST(RLECompressionTest, WhitespaceAndControlCharacters) {
    testRLECase("AA \t\nBB", "A2 1\t1\n1B2");
}
