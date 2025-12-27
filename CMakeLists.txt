cmake_minimum_required(VERSION 3.14)
project(OverDriveSystem LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Required packages
find_package(Threads REQUIRED)
find_package(OpenSSL REQUIRED)

# GoogleTest setup
include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/refs/tags/v1.14.0.zip
)
set(FETCHCONTENT_QUIET OFF)
FetchContent_MakeAvailable(googletest)

enable_testing()

# ==============================================================================
# Library: File Management
# ==============================================================================
add_library(file_management_lib
    storage-server/src/file/storage/LocalFileStorage.cpp
    storage-server/src/file/storage/CompressedFileStorage.cpp
    storage-server/src/file/compressor/RLECompressor.cpp
    storage-server/src/file/management/LocalFileManagement.cpp
    storage-server/src/file/management/ThreadSafeFileManagement.cpp
)

target_include_directories(file_management_lib PUBLIC 
    ${CMAKE_CURRENT_SOURCE_DIR}/storage-server/src
)
target_link_libraries(file_management_lib PUBLIC OpenSSL::SSL OpenSSL::Crypto)

# ==============================================================================
# Library: Server Logic (Includes ThreadPool)
# ==============================================================================
add_library(server_lib
    storage-server/src/server/server.cpp
    storage-server/src/handlers/ClientHandler.cpp
    storage-server/src/handlers/ClientHandlerFactory.cpp
    storage-server/src/commands/ClientCommandFactory.cpp
    storage-server/src/commands/PostCommand.cpp
    storage-server/src/commands/GetCommand.cpp
    storage-server/src/commands/DeleteCommand.cpp
    storage-server/src/commands/SearchCommand.cpp
    storage-server/src/executors/CommandExecutor.cpp
    storage-server/src/parsers/CommandParser.cpp
    storage-server/src/threading/DedicatedThreadManager.cpp
    storage-server/src/threading/ThreadPoolManager.cpp # Pool required for Ex3 [cite: 75]
    Common/include/communication/ClientServerComm.cpp
)

target_include_directories(server_lib PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/storage-server/src
    ${CMAKE_CURRENT_SOURCE_DIR}/storage-server/include
    ${CMAKE_CURRENT_SOURCE_DIR}/Common/include
    ${CMAKE_CURRENT_SOURCE_DIR}/Client/include
)

target_link_libraries(server_lib PUBLIC 
    file_management_lib 
    Threads::Threads
)

# ==============================================================================
# Executables
# ==============================================================================
# Storage Server
add_executable(server_main storage-server/src/server/server_main.cpp)
target_link_libraries(server_main server_lib)

# Client Application
add_library(client_lib
    Client/src/Client/Client.cpp
    Client/src/communication/UserClientComm.cpp
    Common/include/communication/ClientServerComm.cpp
)
target_include_directories(client_lib PUBLIC 
    ${CMAKE_CURRENT_SOURCE_DIR}/Client/include
    ${CMAKE_CURRENT_SOURCE_DIR}/Client/src
    ${CMAKE_CURRENT_SOURCE_DIR}/Common/include
)
add_executable(client_main Client/src/Client/client_main.cpp)
target_link_libraries(client_main client_lib OpenSSL::SSL OpenSSL::Crypto)

# ==============================================================================
# Tests (All 14 Tests included)
# ==============================================================================
# Macro to simplify repetitive test definitions
macro(add_od_test TEST_NAME SRC_FILE)
    add_executable(${TEST_NAME} ${SRC_FILE})
    target_link_libraries(${TEST_NAME} server_lib file_management_lib gtest gtest_main)
    add_test(NAME ${TEST_NAME} COMMAND ${TEST_NAME})
endmacro()

add_od_test(test_local_file_storage storage-server/tests/test_LocalFileStorage.cpp)
add_od_test(test_rle_compressor storage-server/tests/RLECompression_test.cpp)
add_od_test(test_local_file_management storage-server/tests/test_LocalFileManagement.cpp)
add_od_test(test_thread_safe_file_management storage-server/tests/ThreadSafeFileManagement_test.cpp)
add_od_test(test_command_parsing storage-server/tests/test_CommandParsing.cpp)
add_od_test(test_command_executor storage-server/tests/test_CommandExecutor.cpp)
add_od_test(test_post_command storage-server/tests/PostCommandTest.cpp)
add_od_test(test_get_command storage-server/tests/GetCommandTest.cpp)
add_od_test(test_delete_command storage-server/tests/DeleteCommandTest.cpp)
add_od_test(test_search_command storage-server/tests/SearchCommandTest.cpp)

# Specialized Test: ClientServerComm needs specific include directories
add_executable(test_client_server_comm storage-server/tests/test_ClientServerComm.cpp Common/include/communication/ClientServerComm.cpp)
target_include_directories(test_client_server_comm PRIVATE Common/include storage-server/include)
target_link_libraries(test_client_server_comm gtest gtest_main)
add_test(NAME test_client_server_comm COMMAND test_client_server_comm)  