// Keys for localStorage
const STORAGE_KEYS = {
    RAFFLE_DATA: "raffleData", // Store all raffle data in one JSON object
};

// Save data to localStorage
function saveToLocalStorage(data) {
    localStorage.setItem(STORAGE_KEYS.RAFFLE_DATA, JSON.stringify(data));
}

// Load data from localStorage
function loadFromLocalStorage() {
    const data = localStorage.getItem(STORAGE_KEYS.RAFFLE_DATA);
    return data ? JSON.parse(data) : null;
}

// Clear localStorage
function clearLocalStorage() {
    localStorage.removeItem(STORAGE_KEYS.RAFFLE_DATA);
}

// Variables to track raffle state
let raffleData = {
    attendees: [],
    giftCards: [],
    winners: [],
    currentIndex: 0,
};

// Function to parse the .xlsx file and extract data
async function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });

            // Target the sheet named "raffleTicketsHolidayParty"
            const sheetName = "raffleTicketsHolidayParty";
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) {
                reject(new Error(`Sheet "${sheetName}" not found.`));
                return;
            }

            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            // Skip header row and extract "Trivia Attendance" and "Name" columns
            const attendees = jsonData.slice(1).map((row) => {
                const triviaAttendance = parseInt(row[0], 10); // Column 1
                const name = row[1]; // Column 2
                return { name, attendance: triviaAttendance };
            });

            resolve(attendees.filter((attendee) => attendee.name && attendee.attendance));
        };
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file);
    });
}

// Function to get gift card details to build a prize list
async function getGiftCardDetails() {
    const giftCards = [];
    while (true) {
        const value = prompt("Enter the gift card value (e.g., 50):");
        const quantity = prompt("Enter the quantity of this gift card:");
        if (!value || !quantity) {
            alert("Both value and quantity are required. Please try again.");
            continue;
        }

        const parsedValue = parseInt(value, 10);
        const parsedQuantity = parseInt(quantity, 10);

        if (isNaN(parsedValue) || isNaN(parsedQuantity) || parsedQuantity <= 0) {
            alert("Invalid input. Value must be a number, and quantity must be a positive integer.");
            continue;
        }

        giftCards.push({ value: parsedValue, quantity: parsedQuantity });

        const addMore = confirm("Do you want to add more gift cards?");
        if (!addMore) break;
    }

    return giftCards;
}

// Function to render the gift card inventory
function renderGiftCardInventory(giftCards) {
    const inventoryDiv = document.getElementById("giftCardInventory");
    inventoryDiv.innerHTML = ""; // Clear previous content

    giftCards.forEach((giftCard, index) => {
        const cardDiv = document.createElement("div");
        cardDiv.id = `giftCard-${index}`;
        cardDiv.textContent = `Value: $${giftCard.value}, Remaining: ${giftCard.quantity}`;
        inventoryDiv.appendChild(cardDiv);
    });
}

// Function to render the winner list
function renderWinnerList(winners, currentIndex) {
    const winnerListDiv = document.getElementById("winnerList");
    winnerListDiv.innerHTML = "";
    winners.slice(0, currentIndex).forEach((winner, index) => {
        const winnerDiv = document.createElement("div");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `winner-${index}`;
        checkbox.checked = winner.checked || false; // Persist checkbox state
        checkbox.addEventListener("change", () => {
            winner.checked = checkbox.checked; // Update state
            saveToLocalStorage(raffleData); // Save updated winners
            const label = document.getElementById(`winnerLabel-${index}`);
            label.style.textDecoration = checkbox.checked ? "line-through" : "none";
        });

        const label = document.createElement("label");
        label.id = `winnerLabel-${index}`;
        label.textContent = `${winner.name} - Prize: $${winner.prize}`;
        label.style.marginLeft = "10px";
        label.style.textDecoration = winner.checked ? "line-through" : "none";

        winnerDiv.appendChild(checkbox);
        winnerDiv.appendChild(label);
        winnerListDiv.appendChild(winnerDiv);
    });
}

// Function to generate tickets
function generateTickets(attendees) {
    const tickets = [];
    attendees.forEach((attendee) => {
        for (let i = 0; i < attendee.attendance; i++) {
            tickets.push(attendee.name);
        }
    });
    return tickets;
}

// Shuffle an array
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Function to update the gift card inventory
function updateGiftCardInventory(prizeValue) {
    const giftCard = raffleData.giftCards.find((card) => card.value === prizeValue);
    if (giftCard && giftCard.quantity > 0) {
        giftCard.quantity--; // Decrease the quantity of the selected gift card
        saveToLocalStorage(raffleData); // Save updated state to localStorage
        renderGiftCardInventory(raffleData.giftCards); // Refresh the inventory display
    } else {
        console.warn(`Gift card with value $${prizeValue} not found or no remaining cards.`);
    }
}

// Conduct the raffle with unique winners
function drawUniqueWinners(tickets, giftCards) {
    const sortedGiftCards = [...giftCards].sort((a, b) => b.value - a.value);
    const shuffledTickets = shuffle(tickets);
    const winners = [];
    const winnersSet = new Set();

    sortedGiftCards.forEach((card) => {
        for (let i = 0; i < card.quantity; i++) {
            let winner;
            do {
                winner = shuffledTickets.pop();
            } while (winnersSet.has(winner) && shuffledTickets.length > 0);

            if (winner && !winnersSet.has(winner)) {
                winners.push({ name: winner, prize: card.value, checked: false });
                winnersSet.add(winner);
            }
        }
    });

    return winners;
}

// Function to show the next winner
function showNextWinner() {
    if (raffleData.currentIndex < raffleData.winners.length) {
        const winner = raffleData.winners[raffleData.currentIndex];
        alert(`Winner: ${winner.name}, Prize: $${winner.prize}`);

        updateGiftCardInventory(winner.prize);

        raffleData.currentIndex++;
        saveToLocalStorage(raffleData); // Save updated state to localStorage
        renderWinnerList(raffleData.winners, raffleData.currentIndex);
    } else {
        alert("All winners have been revealed!");
    }
}

// Attach the function to a button
document.getElementById("revealButton").addEventListener("click", showNextWinner);

// Load the .xlsx file and conduct the raffle
document.getElementById("uploadFile").addEventListener("change", async (event) => {
    try {
        const file = event.target.files[0];
        if (!file) {
            alert("No file selected.");
            return;
        }

        raffleData.attendees = await parseExcelFile(file);
        const tickets = generateTickets(raffleData.attendees);
        raffleData.giftCards = await getGiftCardDetails();
        renderGiftCardInventory(raffleData.giftCards);

        raffleData.winners = drawUniqueWinners(tickets, raffleData.giftCards).reverse();
        raffleData.currentIndex = 0;

        saveToLocalStorage(raffleData); // Save initial state to localStorage
        alert("Raffle setup is complete! Click the button to reveal winners.");
        document.getElementById("revealButton").disabled = false;
    } catch (error) {
        console.error("Error loading file:", error);
        alert("Failed to load the file. Please check the console for details.");
    }
});

// Load raffle data on page load
window.addEventListener("load", () => {
    const savedData = loadFromLocalStorage();
    if (savedData) {
        raffleData = savedData; // Restore raffle state
        renderGiftCardInventory(raffleData.giftCards);
        renderWinnerList(raffleData.winners, raffleData.currentIndex);
        document.getElementById("revealButton").disabled =
            raffleData.currentIndex >= raffleData.winners.length;
    }
});
