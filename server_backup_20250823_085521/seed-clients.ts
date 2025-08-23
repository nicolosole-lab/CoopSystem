import { db } from "./db";
import { clients } from "@shared/schema";

async function seedClients() {
  try {
    // Insert sample clients
    const sampleClients = [
      {
        firstName: "Maria",
        lastName: "Rossi",
        email: "maria.rossi@example.com",
        phone: "+39 333 1234567",
        address: "Via Roma 123",
        city: "Milano",
        state: "MI",
        zipCode: "20100",
        serviceType: "personal-care",
        status: "active",
        notes: "Requires daily personal care assistance"
      },
      {
        firstName: "Giovanni",
        lastName: "Bianchi",
        email: "giovanni.bianchi@example.com",
        phone: "+39 334 2345678",
        address: "Corso Italia 45",
        city: "Roma",
        state: "RM",
        zipCode: "00100",
        serviceType: "home-support",
        status: "active",
        notes: "Weekly home support and meal preparation"
      },
      {
        firstName: "Anna",
        lastName: "Ferrari",
        email: "anna.ferrari@example.com",
        phone: "+39 335 3456789",
        address: "Piazza Duomo 10",
        city: "Firenze",
        state: "FI",
        zipCode: "50100",
        serviceType: "medical-assistance",
        status: "active",
        notes: "Medical monitoring and medication management"
      }
    ];

    console.log("Seeding clients...");
    
    for (const client of sampleClients) {
      await db.insert(clients).values(client);
      console.log(`Created client: ${client.firstName} ${client.lastName}`);
    }
    
    console.log("Successfully seeded 3 sample clients!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding clients:", error);
    process.exit(1);
  }
}

seedClients();