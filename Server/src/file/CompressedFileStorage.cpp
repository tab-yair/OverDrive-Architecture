#include "CompressedFileStorage.h"

using namespace std;
namespace fs = std::filesystem;

CompressedFileStorage::CompressedFileStorage(std::unique_ptr<ICompressor> comp, std::unique_ptr<IFileStorage> storage)
    : compressor(std::move(comp)), basicStorage(std::move(storage)) {}

void CompressedFileStorage::writeFile(const std::filesystem::path& physicalPath, const std::string &content) {
    if (!compressor) {
        throw runtime_error("Compressor not set");
    }   
    std::string compressed = compressor->compress(content);
    basicStorage->writeFile(physicalPath, compressed);
}

std::string CompressedFileStorage::readFile(const std::filesystem::path& physicalPath) {
    if (!compressor) {
        throw runtime_error("Compressor not set");
    }   
    std::string compressed = basicStorage->readFile(physicalPath);
    return compressor->decompress(compressed);
}

void CompressedFileStorage::deleteFile(const std::filesystem::path& physicalPath) {
    basicStorage->deleteFile(physicalPath);
}

