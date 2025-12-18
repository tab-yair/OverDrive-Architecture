cmake_minimum_required(VERSION 3.14)
project(OverDriveTests LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Threads REQUIRED)

# GoogleTest
include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/refs/tags/v1.14.0.zip
)
set(FETCHCONTENT_QUIET OFF)
FetchContent_MakeAvailable(googletest)

enable_testing()

# Library: File Management (path, storage, compressor, metadata)
add_library(file_management_lib
    # Path mapping
    Storage-Server/src/file/path/HashPathMapper.cpp
    
    # Storage
    Storage-Server/src/file/storage/LocalFileStorage.cpp
    Storage-Server/src/file/storage/CompressedFileStorage.cpp
    
    # Compressor
    Storage-Server/src/file/compressor/RLECompressor.cpp
    
    # Metadata
    Storage-Server/src/file/metadata/JsonMetadataStore.cpp

    # Management
    Storage-Server/src/file/management/LocalFileManagement.cpp
    Storage-Server/src/file/management/ThreadSafeFileManagement.cpp
)

target_include_directories(file_management_lib PUBLIC
    Storage-Server/src
)

# Find OpenSSL for SHA256
find_package(OpenSSL REQUIRED)
target_link_libraries(file_management_lib PUBLIC OpenSSL::SSL OpenSSL::Crypto)

# Test 1: HashPathMapper
add_executable(test_hash_path_mapper 
    Storage-Server/tests/test_hash_path_mapper.cpp
)

target_link_libraries(test_hash_path_mapper
    file_management_lib
    gtest
    gtest_main
)

add_test(NAME test_hash_path_mapper COMMAND test_hash_path_mapper)

# Test 2: LocalFileStorage
add_executable(test_local_file_storage
    Storage-Server/tests/test_LocalFileStorage.cpp
)

target_link_libraries(test_local_file_storage
    file_management_lib
    gtest
    gtest_main
)

add_test(NAME test_local_file_storage COMMAND test_local_file_storage)

# Test 3: CompressedFileStorage
add_executable(test_compressed_file_storage
    Storage-Server/tests/test_compreesedFileStorage.cpp
)

target_link_libraries(test_compressed_file_storage
    file_management_lib
    gtest
    gtest_main
)

add_test(NAME test_compressed_file_storage COMMAND test_compressed_file_storage)

# Test 4: JsonMetadataStore
add_executable(test_json_metadata_store
    Storage-Server/tests/JsonMetaDataStore.cpp
)

target_link_libraries(test_json_metadata_store
    file_management_lib
    gtest
    gtest_main
)

add_test(NAME test_json_metadata_store COMMAND test_json_metadata_store)

# Test 5: RLECompressor
add_executable(test_rle_compressor
    Storage-Server/tests/RLECompression_test.cpp
)

target_link_libraries(test_rle_compressor
    file_management_lib
    gtest
    gtest_main
)

add_test(NAME test_rle_compressor COMMAND test_rle_compressor)

# Test 6: LocalFileManagement
add_executable(test_local_file_management
    Storage-Server/tests/test_LocalFileManagement.cpp
)
target_link_libraries(test_local_file_management
    file_management_lib
    gtest
    gtest_main
)
add_test(NAME test_local_file_management COMMAND test_local_file_management)

# Test 7: ThreadSafeFileManagement
add_executable(test_thread_safe_file_management
    Storage-Server/tests/ThreadSafeFileManagement_test.cpp
)
target_link_libraries(test_thread_safe_file_management
    file_management_lib
    gtest
    gtest_main
)
add_test(NAME test_thread_safe_file_management COMMAND test_thread_safe_file_management)

# Test 8: CommandParser
add_executable(test_command_parsing
    Storage-Server/tests/test_CommandParsing.cpp
)
target_link_libraries(test_command_parsing
    server_lib
    gtest
    gtest_main
)
add_test(NAME test_command_parsing COMMAND test_command_parsing)

# Test 9: CommandExecutor
add_executable(test_command_executor
    Storage-Server/tests/test_CommandExecutor.cpp
)
target_link_libraries(test_command_executor
    server_lib
    file_management_lib
    gtest
    gtest_main
)
add_test(NAME test_command_executor COMMAND test_command_executor)

# Test 10: PostCommand
add_executable(test_post_command
    Storage-Server/tests/PostCommandTest.cpp
)
target_link_libraries(test_post_command
    server_lib
    file_management_lib
    gtest
    gtest_main
)
add_test(NAME test_post_command COMMAND test_post_command)

# Test 11: GetCommand
add_executable(test_get_command
    Storage-Server/tests/GetCommandTest.cpp
)
target_link_libraries(test_get_command
    server_lib
    file_management_lib
    gtest
    gtest_main
)
add_test(NAME test_get_command COMMAND test_get_command)

# Test 12: DeleteCommand
add_executable(test_delete_command
    Storage-Server/tests/DeleteCommandTest.cpp
)
target_link_libraries(test_delete_command
    server_lib
    file_management_lib
    gtest
    gtest_main
)
add_test(NAME test_delete_command COMMAND test_delete_command)

# Test 13: SearchCommand
add_executable(test_search_command
    Storage-Server/tests/SearchCommandTest.cpp
)
target_link_libraries(test_search_command
    server_lib
    file_management_lib
    gtest
    gtest_main
)
add_test(NAME test_search_command COMMAND test_search_command)

# Test 14: ClientServerComm
add_executable(test_client_server_comm
    Storage-Server/tests/test_ClientServerComm.cpp
    Common/include/communication/ClientServerComm.cpp
)
target_include_directories(test_client_server_comm PRIVATE
    Common/include
    Storage-Server/include
)
target_link_libraries(test_client_server_comm
    gtest
    gtest_main
)
add_test(NAME test_client_server_comm COMMAND test_client_server_comm)

# ==============================================================================
# Server Executable
# ==============================================================================
add_library(server_lib
    Storage-Server/src/server/server.cpp
    Storage-Server/src/handlers/ClientHandler.cpp
    Storage-Server/src/handlers/ClientHandlerFactory.cpp
    Storage-Server/src/commands/ClientCommandFactory.cpp
    Storage-Server/src/commands/PostCommand.cpp
    Storage-Server/src/commands/GetCommand.cpp
    Storage-Server/src/commands/DeleteCommand.cpp
    Storage-Server/src/commands/SearchCommand.cpp
    Storage-Server/src/executors/CommandExecutor.cpp
    Storage-Server/src/parsers/CommandParser.cpp
    Storage-Server/src/threading/DedicatedThreadManager.cpp
    Common/include/communication/ClientServerComm.cpp
)

target_include_directories(server_lib PUBLIC
    Storage-Server/src
    Storage-Server/include
    Common/include
)

target_link_libraries(server_lib PUBLIC
    file_management_lib
    OpenSSL::SSL
    OpenSSL::Crypto
)

add_executable(server_main
    Storage-Server/src/server/server_main.cpp
)

target_link_libraries(server_main
    server_lib
    file_management_lib
    Threads::Threads
)

# ==============================================================================
# Client Executable  
# ==============================================================================
add_library(client_lib
    Client/src/Client/Client.cpp
    Client/src/communication/UserClientComm.cpp
    Common/include/communication/ClientServerComm.cpp
)

target_include_directories(client_lib PUBLIC
    Client/src
    Client/include
    Storage-Server/src
    Storage-Server/include
    Common/include
)

target_link_libraries(client_lib PUBLIC
    OpenSSL::SSL
    OpenSSL::Crypto
)

add_executable(client_main
    Client/src/Client/client_main.cpp
)

target_link_libraries(client_main
    client_lib
)


