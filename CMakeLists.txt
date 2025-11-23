cmake_minimum_required(VERSION 3.14)
project(OverDrive LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Put runtime binaries in bin/
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

# --- Sources ---
file(GLOB_RECURSE OVERDRIVE_SRC CONFIGURE_DEPENDS
    ${CMAKE_SOURCE_DIR}/src/*.cpp
)

# Exclude main.cpp and App.cpp from the library
list(FILTER OVERDRIVE_SRC EXCLUDE REGEX ".*/main\\.cpp$")
list(FILTER OVERDRIVE_SRC EXCLUDE REGEX ".*/App\\.cpp$")

add_library(overdrive STATIC ${OVERDRIVE_SRC}) 
target_include_directories(overdrive PUBLIC 
    ${CMAKE_SOURCE_DIR}/src
    ${CMAKE_SOURCE_DIR}/tests
)

# main.cpp and App.cpp for the main application - optional
if(EXISTS ${CMAKE_SOURCE_DIR}/src/main.cpp AND EXISTS ${CMAKE_SOURCE_DIR}/src/App.cpp)
    add_executable(overdrive_main_app 
    ${CMAKE_SOURCE_DIR}/src/main.cpp 
    ${CMAKE_SOURCE_DIR}/src/app/App.cpp
    )
    target_link_libraries(overdrive_main_app PRIVATE overdrive)
     # define output directory for the main app
    set_target_properties(overdrive_main_app PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR})
endif()

# --- GoogleTest ---
include(FetchContent)
FetchContent_Declare(
    googletest
    URL https://github.com/google/googletest/archive/refs/tags/release-1.12.1.zip
)
FetchContent_MakeAvailable(googletest)

enable_testing()

# --- Tests ---
file(GLOB_RECURSE OVERDRIVE_TESTS CONFIGURE_DEPENDS
    ${CMAKE_SOURCE_DIR}/tests/*.cpp
)

foreach(test_file ${OVERDRIVE_TESTS})
    get_filename_component(test_name ${test_file} NAME_WE)
    add_executable(${test_name} ${test_file})
    target_link_libraries(${test_name} PRIVATE overdrive gtest_main)
    add_test(NAME ${test_name} COMMAND ${test_name})
endforeach()