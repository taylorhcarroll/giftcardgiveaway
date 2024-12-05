
// Variables to track raffle state
let currentIndex = 0;
let reversedWinners = [];
let giftCards = [];

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

function renderGiftCardInventory(giftCards) {
    const inventoryDiv = document.getElementById("giftCardInventory");
    inventoryDiv.innerHTML = ""; // Clear previous content

    giftCards.forEach((giftCard, index) => {
        const cardDiv = document.createElement("div");
        cardDiv.id = `giftCard-${index}`;
        cardDiv.textContent = `Value: $${giftCard.value}, Remaining: ${giftCard.quantity}`;
        inventoryDiv.appendChild(cardDiv);
    });

    console.log("Gift card inventory rendered.", giftCards); // Debug log
}


// Function to render the winner list
function renderWinnerList(winners) {
    const winnerListDiv = document.getElementById("winnerList");
    winnerListDiv.innerHTML = "";
    winners.forEach((winner, index) => {
        const winnerDiv = document.createElement("div");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `winner-${index}`;
        checkbox.addEventListener("change", () => {
            const label = document.getElementById(`winnerLabel-${index}`);
            if (checkbox.checked) {
                label.style.textDecoration = "line-through";
            } else {
                label.style.textDecoration = "none";
            }
        });

        const label = document.createElement("label");
        label.id = `winnerLabel-${index}`;
        label.textContent = `${winner.name} - Prize: $${winner.prize}`;
        label.style.marginLeft = "10px";

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

function updateGiftCardInventory(giftCards, prizeValue) {
    // Find the gift card with the specified prize value
    console.log(giftCards, prizeValue)
    const giftCard = giftCards.find((card) => card.value === prizeValue);
    if (giftCard && giftCards.quantity > 0) {
        giftCards.quantity--; // Decrease the quantity of the selected gift card
        console.log(`Updated gift card inventory: ${JSON.stringify(giftCards)}`); // Debug log
        renderGiftCardInventory(giftCards); // Refresh the gift card inventory display
    } else {
        console.warn(`Gift card with value $${prizeValue} not found or no remaining cards.`); // Debug warning
    }
}

// Conduct the raffle with unique winners
function drawUniqueWinners(tickets, giftCards) {
    // Sort gift cards by value (highest first)
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
                winners.push({ name: winner, prize: card.value });
                winnersSet.add(winner);
            }
        }
    });
    return winners;
}

// Function to show the next winner
function showNextWinner() {
    if (currentIndex < reversedWinners.length) {
        const winner = reversedWinners[currentIndex];
        alert(`Winner: ${winner.name}, Prize: $${winner.prize}`);

        // Update gift card inventory
        updateGiftCardInventory(giftCards, winner.prize);

        currentIndex++;

        // Update winner list dynamically
        renderWinnerList(reversedWinners.slice(0, currentIndex));

        // // Update gift card inventory dynamically
        // const inventoryDiv = document.getElementById("giftCardInventory");
        // inventoryDiv.children.forEach((child, index) => {
        //     const remaining = reversedWinners.filter((w) => w.prize === giftCards[index].value).length;
        //     child.textContent = `Value: $${giftCards[index].value}, Remaining: ${giftCards[index].quantity - remaining}`;
        // });
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

        const attendees = await parseExcelFile(file);
        const tickets = generateTickets(attendees);
        giftCards = await getGiftCardDetails();
        // Render initial gift card inventory
        renderGiftCardInventory(giftCards);

        const winners = drawUniqueWinners(tickets, giftCards);
        reversedWinners = winners.reverse(); // Reverse for announcement order

        alert("Raffle setup is complete! Click the button to reveal winners.");
        document.getElementById("revealButton").disabled = false;
    } catch (error) {
        console.error("Error loading file:", error);
        alert("Failed to load the file. Please check the console for details.");
    }
});
