#include <gtest/gtest.h>
#include "compressor/RLECompressor.h"

// ---------------- HELPER FUNCTION ----------------
// Helper function to test compression and decompression
void testRLECase(const std::string& input, const std::string& expectedCompressed) {
    RLECompressor rle;
    std::string compressed = rle.compress(input);
    EXPECT_EQ(compressed, expectedCompressed);

    std::string decompressed = rle.decompress(compressed);
    EXPECT_EQ(decompressed, input);
}

// ---------------- VALID INPUT TESTS ----------------

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

// ---------------- INVALID INPUT TESTS ----------------

// All invalid inputs should cause the functions to return an empty string.


// Test decompress rejects malformed compressed strings
TEST(RLECompressionInvalidInput, DecompressRejectsMalformedCompressedStrings) {
    RLECompressor rle;
    EXPECT_THROW(rle.decompress("A0"), std::invalid_argument);      // count zero invalid
    EXPECT_THROW(rle.decompress("A01"), std::invalid_argument);     // leading zero in count invalid
    EXPECT_THROW(rle.decompress("1A"), std::invalid_argument);      // starts with digit (no leading character)
    EXPECT_THROW(rle.decompress("A-1"), std::invalid_argument);     // negative count invalid (hyphen)
    EXPECT_THROW(rle.decompress("AB"), std::invalid_argument);      // missing numeric counts entirely
    EXPECT_THROW(rle.decompress("A2B"), std::invalid_argument);     // missing count for last character
    EXPECT_THROW(rle.decompress("A2B03"), std::invalid_argument);   // B count has leading zero
}


