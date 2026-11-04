/* Puzzle ideas — added with the Puzzle Directory's "+ New puzzle" button,
   which rewrites this file through the GitHub API, so don't hand-edit it.
   Each idea is a puzzle number with a title and the idea in words;
   puzzles_curated_data.js lists ideas without a built puzzle yet as puzzles
   of their own, and shows the idea above a puzzle once it's built. */
const PUZZLE_IDEAS = [
 {
  "num": 8,
  "title": "A not so useless area",
  "idea": "",
  "added": 1793312653623
 },
 {
  "num": 10,
  "title": "The mountain The Goat and the palm tree",
  "idea": "This puzzle will have a lock with 3 symbols, each with a dial around it from 1 to 12. There's also going to be a story that tells what each symbol should point to.\n\nStory hinting at the answer:\nFaris woke his camel five hours before the sun stood overhead.\n\nHe walked until the dunes lost their shadows and found an oasis of palms. He rested there three hours, then walked five more, and pitched his tent.\n\nRemember when he woke his camel, found the palm, and pitched his tent, and the desert will let you pass.",
  "added": 1793311985580
 },
 {
  "num": 11,
  "title": "The Four tiles",
  "idea": "There will be four seperate tiles each will show a scene or a picture containing a hidden number. the thumbnails of the tiles will show the positions of the numbers on the unlocker",
  "added": 1793312612449
 },
 {
  "num": 12,
  "title": "The logic of the unruly female camel",
  "idea": "6x6 grid: \nColumns - A to F\nRows - 1 to 6\n\nRules:\nThe well sits in one of the four center squares.\nAt noon, the palm’s shadow falls on the well.\nThe tent stands against the north wall, in the same column as the well.\nThe camel is tied to the west wall, in the same row as the well, exactly three steps from it.\nThe camel is never tied in the southern half of the courtyard, where the sun beats hardest.\nThe evening wind blows from the west, so the fire pit must sit east of the tent, on the same wall.\nThe fire pit can’t touch any other object, not even diagonally.\n\nSolution: Well D3 · Palm D4 · Tent D1 · Camel A3 · Fire F1 (same as before)",
  "added": 1793312876695
 },
 {
  "num": 13,
  "title": "Lanterns",
  "idea": "Answer: STAR\n\nAssets\n\nTwo lantern objects in the scene, placed east and west. Each needs three glow levels: off, dim, and bright.\nA 3×9 letter grid the player can find in the scene (wall carving, tile, carpet, scroll, etc.).\nOptional inscription.\n\nLantern behavior\n\nEast lantern has 3 states, which select the grid row: constant dim (row 1), constant bright (row 2), or fast flashing (row 3). It holds its state for the whole letter.\nWest lantern only flickers. The number of flickers selects the grid column (1–9).\nBetween letters: both lanterns go dark for about 2 seconds.\nAfter the full word: both lanterns go dark for about 6 seconds, then the sequence loops forever.\nSuggested timing: west flicker is 0.4s on / 0.4s off, slow enough to count. East flashing is fast (about 0.15s) so it reads as a state, not something to count.\n\nSequence\n\n#\tLetter\tEast lantern\tWest flickers\n1\tS\tConstant bright\t6\n2\tT\tConstant dim\t2\n3\tA\tFlashing\t5\n4\tR\tConstant dim\t9\n\nGrid (row labels should be lantern icons: dim, bright, flashing, not words)\n\n\t1\t2\t3\t4\t5\t6\t7\t8\t9\nDim\tG\tT\tQ\tM\tL\tW\tE\tX\tR\nBright\tK\tN\tI\tZ\tB\tS\tF\tU\tO\nFlashing\tH\tV\tY\tD\tA\tC\tP\tJ\t🌴\n\nInscription (optional hint)\n\nThe eastern flame tells you how it burns. The western flame tells you how far to walk.\n\nSolve condition: the player enters STAR.",
  "added": 1793313195817
 },
 {
  "num": 14,
  "title": "Mecha Camel",
  "idea": "I made a mockup, pattern_tiles_concept.png, to check I’ve understood how the puzzle works. Each tile has a core symbol and an outline style. Any two tiles that touch (up, down, left or right, not diagonally) must share either the same core or the same outline.\n\nThe mockup shows a 3×4 board with 4 locked tiles and 8 loose ones. I ran a solver on this layout, and only one arrangement of the 8 loose tiles follows the rule.\n\nI’ve read “matching” as same-to-same: outline matches outline, core matches core. You might have meant crossover matches, where one tile’s core matches its neighbor’s outline. If so, tell me and I’ll rebuild it. Once you confirm, I can swap in desert-themed patterns, like geometric Arabic motifs for the cores and dune or tile borders for the outlines.",
  "added": 1793471496635
 },
 {
  "num": 15,
  "title": "One correct order",
  "idea": "5 objects have to placed in order. order is implied through the patterns on them.",
  "added": 1793471870722
 },
 {
  "num": 16,
  "title": "Inspiration from a child",
  "idea": "realistic drawing of a scene in the desert with different options (camel can be goat or sheep - tent can be car or pickup - palm \n\nchilds drawing containing the answer",
  "added": 1793472369497
 },
 {
  "num": 17,
  "title": "The symbols",
  "idea": "Symbols implying where items should lie, drag n and drop in the correct places.",
  "added": 1793473192644
 }
];
