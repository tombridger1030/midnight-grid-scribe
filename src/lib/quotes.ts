export const quotes = [
  "Discipline is the bridge between goals and accomplishment.",
  "Your future is created by what you do today, not tomorrow.",
  "Success is the sum of small efforts repeated day in and day out.",
  "The only way to do great work is to love what you do.",
  "Strive not to be a success, but rather to be of value."
];

export const getRandomQuote = (): string =>
  quotes[Math.floor(Math.random() * quotes.length)]; 