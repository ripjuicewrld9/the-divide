// src/api/divides.js
let divides = [
  {
    id: 1,
    title: "Sydney Sweeney vs Sabrina Carpenter",
    description: "Who will win the popularity vote?",
    optionA: "Sydney Sweeney",
    optionB: "Sabrina Carpenter",
    imageA: "https://via.placeholder.com/150",
    imageB: "https://via.placeholder.com/150",
    votesA: 0,
    votesB: 0,
    pot: 0,
    endTime: new Date(Date.now() + 1000 * 60 * 5).toISOString(), // 5 mins from now
  },
];

export function getDivides() {
  return Promise.resolve(divides);
}

export function vote(divideId, option) {
  const divide = divides.find((d) => d.id === divideId);
  if (!divide) return Promise.reject("Divide not found");
  divide.pot += 1; // $1 per vote
  if (option === "A") divide.votesA += 1;
  if (option === "B") divide.votesB += 1;
  return Promise.resolve(divide);
}
