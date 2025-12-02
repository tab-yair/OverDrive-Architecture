#ifndef IPATHMAPPER_H
#define IPATHMAPPER_H

#include <string>
#include <filesystem>

// Interface for mapping logical file names to physical file system paths
class IPathMapper {
public:
    virtual ~IPathMapper() = default;
    virtual std::filesystem::path resolve(const std::string& logicalFileName) const = 0;

};

#endif // IPATHMAPPER_H

