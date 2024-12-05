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

            // Convert the sheet to JSON
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

// Simulate the gift card values
const giftCards = [
    { value: 50, quantity: 3 },
    { value: 25, quantity: 5 },
    { value: 10, quantity: 9 }
];

// Generate the ticket pool
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

// Conduct the raffle with unique winners
function drawUniqueWinners(tickets, giftCards) {
    const shuffledTickets = shuffle(tickets);
    const winners = [];
    const winnersSet = new Set();

    giftCards.forEach((card) => {
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

// Display winners one at a time
let currentIndex = 0;
let reversedWinners = [];

function showNextWinner() {
    if (currentIndex < reversedWinners.length) {
        const winner = reversedWinners[currentIndex];
        alert(`Winner: ${winner.name}, Prize: $${winner.prize}`);
        currentIndex++;
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
        const winners = drawUniqueWinners(tickets, giftCards);

        reversedWinners = winners.reverse(); // Reverse for announcement order
        alert("Raffle setup is complete! Click the button to reveal winners.");
        // Enable the reveal button
        document.getElementById("revealButton").disabled = false;
    } catch (error) {
        console.error("Error loading file:", error);
        alert("Failed to load the file. Please check the console for details.");
    }
});
