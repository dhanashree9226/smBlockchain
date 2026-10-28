
const CONTRACT_ADDRESS = "0xaF6962dF97c30F0396df20D91753e1402524fbb7";
const RPC_URL = "http://127.0.0.1:7545";

const ABI = [
  "function admin() view returns (address)",
  "function rooms(uint256) view returns (uint256 roomNumber, bool isOccupied, address student)",
  "function studentRoom(address) view returns (uint256)",
  "function addRoom(uint256 number)",
  "function bookRoom(uint256 number)",
  "function totalRooms() view returns (uint256)",
  "function roomAt(uint256 index) view returns (uint256)",
  "function getRoom(uint256 number) view returns (uint256 roomNumber, bool isOccupied, address student)",
  "function getMyRoom() view returns (uint256)"
];

let provider;
let signer;
let contract;
let account;

const $ = (id) => document.getElementById(id);

function showStatus(id, message, error = false) {
  const element = $(id);
  element.textContent = message;
  element.style.color = error ? "#d04444" : "";
}

function shortAddress(address) {
  return address.slice(0, 6) + "..." + address.slice(-4);
}

async function connectGanache() {
  try {
    showStatus("connectionStatus", "Connecting to Ganache...");

    provider = new ethers.JsonRpcProvider(RPC_URL);

    const network = await provider.getNetwork();
    const accounts = await provider.send("eth_accounts", []);

    if (accounts.length === 0) {
      throw new Error("No Ganache accounts found. Check Ganache is running.");
    }

    account = ethers.getAddress(accounts[0]);
    signer = await provider.getSigner(account);

    const code = await provider.getCode(CONTRACT_ADDRESS);

    if (code === "0x") {
      throw new Error(
        "Contract not found at this address on Ganache. Deploy it to Ganache and update CONTRACT_ADDRESS."
      );
    }

    contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      ABI,
      signer
    );

    $("connectBtn").textContent =
      "Connected: " + shortAddress(account);

    showStatus(
      "connectionStatus",
      "Connected to Ganache. Chain ID: " + network.chainId
    );

    await refreshRooms();
    await checkMyRoom();

  } catch (error) {
    console.error(error);
    showStatus(
      "connectionStatus",
      error.shortMessage || error.message || "Connection failed.",
      true
    );
  }
}

async function refreshRooms() {
  if (!contract) {
    showStatus("connectionStatus", "Connect to Ganache first.", true);
    return;
  }

  const grid = $("roomsGrid");
  grid.innerHTML = '<p class="empty">Loading rooms...</p>';

  try {
    const total = Number(await contract.totalRooms());
    const roomList = [];

    let available = 0;
    let booked = 0;

    for (let i = 0; i < total; i++) {
      const number = Number(await contract.roomAt(i));
      const room = await contract.getRoom(number);

      const details = {
        number,
        occupied: room.isOccupied,
        student: room.student
      };

      roomList.push(details);

      if (details.occupied) {
        booked++;
      } else {
        available++;
      }
    }

    $("totalRooms").textContent = total;
    $("availableRooms").textContent = available;
    $("bookedRooms").textContent = booked;

    grid.innerHTML = "";

    if (roomList.length === 0) {
      grid.innerHTML =
        '<p class="empty">No rooms yet. The admin can add a room below.</p>';
      return;
    }

    for (const room of roomList) {
      const card = document.createElement("article");
      card.className =
        "room-card " + (room.occupied ? "booked" : "available");

      const heading = document.createElement("div");
      heading.className = "room-heading";

      const title = document.createElement("h3");
      title.textContent = "Room " + room.number;

      const badge = document.createElement("span");
      badge.className =
        "badge " + (room.occupied ? "booked" : "available");
      badge.textContent = room.occupied ? "BOOKED" : "AVAILABLE";

      heading.append(title, badge);

      const detail = document.createElement("p");
      detail.textContent = room.occupied
        ? "Student: " + shortAddress(room.student)
        : "Ready for allocation";

      const button = document.createElement("button");
      button.className = room.occupied ? "secondary" : "primary";
      button.textContent = room.occupied ? "Already booked" : "Book Room";
      button.disabled = room.occupied;

      button.addEventListener("click", () => bookRoom(room.number));

      card.append(heading, detail, button);
      grid.appendChild(card);
    }

  } catch (error) {
    console.error(error);
    grid.innerHTML =
      '<p class="empty">Unable to load rooms. Check the contract and network.</p>';

    showStatus(
      "connectionStatus",
      error.shortMessage || error.message || "Failed to load rooms.",
      true
    );
  }
}

async function bookRoom(roomNumber) {
  if (!contract) {
    showStatus("connectionStatus", "Connect to Ganache first.", true);
    return;
  }

  try {
    showStatus(
      "connectionStatus",
      "Booking room " + roomNumber + "..."
    );

    const transaction = await contract.bookRoom(roomNumber);
    await transaction.wait();

    showStatus(
      "connectionStatus",
      "Room " + roomNumber + " booked successfully!"
    );

    await refreshRooms();
    await checkMyRoom();

  } catch (error) {
    console.error(error);
    showStatus(
      "connectionStatus",
      error.reason || error.shortMessage || error.message || "Booking failed.",
      true
    );
  }
}

async function checkMyRoom() {
  if (!contract || !account) {
    showStatus("myRoomStatus", "Connect your Ganache account first.");
    return;
  }

  try {
    const roomNumber = Number(await contract.studentRoom(account));

    if (roomNumber === 0) {
      $("myRoom").textContent = "Not assigned";
      showStatus(
        "myRoomStatus",
        "This account has not booked a room yet."
      );
    } else {
      $("myRoom").textContent = "Room " + roomNumber;
      showStatus(
        "myRoomStatus",
        "Your room allocation is saved on the blockchain."
      );
    }

  } catch (error) {
    console.error(error);
    showStatus(
      "myRoomStatus",
      error.shortMessage || error.message || "Could not check room.",
      true
    );
  }
}

async function addRoom(event) {
  event.preventDefault();

  if (!contract || !account) {
    showStatus("adminStatus", "Connect to Ganache first.", true);
    return;
  }

  const number = Number($("roomNumber").value);

  if (!Number.isSafeInteger(number) || number <= 0) {
    showStatus("adminStatus", "Enter a valid room number.", true);
    return;
  }

  try {
    const admin = ethers.getAddress(await contract.admin());

    if (admin !== ethers.getAddress(account)) {
      throw new Error(
        "Only the account that deployed the contract can add rooms."
      );
    }

    showStatus("adminStatus", "Adding room...");

    const transaction = await contract.addRoom(number);
    await transaction.wait();

    $("roomNumber").value = "";

    showStatus(
      "adminStatus",
      "Room " + number + " added successfully!"
    );

    await refreshRooms();

  } catch (error) {
    console.error(error);
    showStatus(
      "adminStatus",
      error.reason || error.shortMessage || error.message || "Could not add room.",
      true
    );
  }
}

$("connectBtn").addEventListener("click", connectGanache);
$("refreshBtn").addEventListener("click", refreshRooms);
$("checkMyRoomBtn").addEventListener("click", checkMyRoom);
$("addRoomForm").addEventListener("submit", addRoom);
