
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HostelRoomAllocation {
    address public admin;

    struct Room {
        uint256 roomNumber;
        bool isOccupied;
        address student;
    }

    mapping(uint256 => Room) public rooms;
    mapping(address => uint256) public studentRoom;
    uint256[] private roomNumbers;

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin allowed");
        _;
    }

    function addRoom(uint256 number) external onlyAdmin {
        require(number > 0, "Invalid room number");
        require(rooms[number].roomNumber == 0, "Room already exists");

        rooms[number] = Room(number, false, address(0));
        roomNumbers.push(number);
    }

    function bookRoom(uint256 number) external {
        require(rooms[number].roomNumber != 0, "Room does not exist");
        require(!rooms[number].isOccupied, "Room already occupied");
        require(studentRoom[msg.sender] == 0, "Student already has a room");

        rooms[number].isOccupied = true;
        rooms[number].student = msg.sender;
        studentRoom[msg.sender] = number;
    }

    function totalRooms() external view returns (uint256) {
        return roomNumbers.length;
    }

    function roomAt(uint256 index) external view returns (uint256) {
        require(index < roomNumbers.length, "Invalid index");
        return roomNumbers[index];
    }

    function getRoom(uint256 number)
        external
        view
        returns (uint256, bool, address)
    {
        Room memory r = rooms[number];
        return (r.roomNumber, r.isOccupied, r.student);
    }

    function getMyRoom() external view returns (uint256) {
        return studentRoom[msg.sender];
    }
}
