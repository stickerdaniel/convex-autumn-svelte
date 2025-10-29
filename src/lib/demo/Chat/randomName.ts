const namesList =
  "Robert,Linda,Daniel,Anthony,Donald,Paul,Kevin,Brian,Patricia,Jennifer," +
  "Elizabeth,William,Richard,Jessica,Lisa,Nancy,Matthew,Ashley,Kimberly," +
  "Donna,Kenneth,Melissa";
const names = namesList.split(",");

/**
 * Generates a random name for demo users, optionally abbreviated.
 *
 * @returns A random name, either full or truncated to first 3 characters.
 */
export function randomName(): string {
  const picked = names[Math.floor(Math.random() * names.length)];
  // Randomly abbreviate names to simulate varied user display preferences.
  return Math.random() > 0.5 ? picked.slice(0, 3) : picked;
}
