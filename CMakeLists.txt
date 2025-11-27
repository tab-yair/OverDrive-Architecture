cmake_minimum_required(VERSION 3.14)
project(OverDrive LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Put runtime binaries in bin/
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

# --- Server Sources ---
file(GLOB_RECURSE SERVER_SRC CONFIGURE_DEPENDS
    ${CMAKE_SOURCE_DIR}/Server/src/*.cpp
)

# Exclude main.cpp from the library
list(FILTER SERVER_SRC EXCLUDE REGEX ".*/main\\.cpp$")

# --- Client Sources ---
file(GLOB_RECURSE CLIENT_SRC CONFIGURE_DEPENDS
    ${CMAKE_SOURCE_DIR}/Client/src/*.cpp
)

# Build server library
add_library(overdrive_server STATIC ${SERVER_SRC}) 
target_include_directories(overdrive_server PUBLIC 
    ${CMAKE_SOURCE_DIR}/Server/src
    ${CMAKE_SOURCE_DIR}/Common/include
    ${CMAKE_SOURCE_DIR}
)

# Build client library
add_library(overdrive_client STATIC ${CLIENT_SRC}) 
target_include_directories(overdrive_client PUBLIC 
    ${CMAKE_SOURCE_DIR}/Client/src
    ${CMAKE_SOURCE_DIR}/Common/include
    ${CMAKE_SOURCE_DIR}
)

# Server main executable - optional
if(EXISTS ${CMAKE_SOURCE_DIR}/Server/src/main.cpp)
    add_executable(overdrive_server_app 
        ${CMAKE_SOURCE_DIR}/Server/src/main.cpp
    )
    target_link_libraries(overdrive_server_app PRIVATE overdrive_server)
    set_target_properties(overdrive_server_app PROPERTIES
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

# --- Server Tests ---
file(GLOB_RECURSE SERVER_TESTS CONFIGURE_DEPENDS
    ${CMAKE_SOURCE_DIR}/Server/tests/*.cpp
)

foreach(test_file ${SERVER_TESTS})
    get_filename_component(test_name ${test_file} NAME_WE)
    add_executable(${test_name} ${test_file})
    target_link_libraries(${test_name} PRIVATE overdrive_server gtest_main)
    target_include_directories(${test_name} PRIVATE 
        ${CMAKE_SOURCE_DIR}/Server/tests
    )
    add_test(NAME ${test_name} COMMAND ${test_name})
endforeach()

# --- Client Tests ---
file(GLOB_RECURSE CLIENT_TESTS CONFIGURE_DEPENDS
    ${CMAKE_SOURCE_DIR}/Client/tests/*.cpp
)

foreach(test_file ${CLIENT_TESTS})
    get_filename_component(test_name ${test_file} NAME_WE)
    add_executable(${test_name} ${test_file})
    target_link_libraries(${test_name} PRIVATE overdrive_client gtest_main)
    target_include_directories(${test_name} PRIVATE 
        ${CMAKE_SOURCE_DIR}/Client/tests
    )
    add_test(NAME ${test_name} COMMAND ${test_name})
endforeach()