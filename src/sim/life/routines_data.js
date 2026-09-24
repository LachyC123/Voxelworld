// Words and shop data for routines*.js: what people buy where, how the crosshair caption reads
// ("Buying a Centennial loaf at Halloran's"), and what they say while they're at it.
// Captions read two ways: as is while they're there, and as "On the way — <caption>" while walking.

// key: { n: building name, tags: spot tags inside, d: [min, max] dwell minutes, open: [t0, t1] (minutes),
//        who: 'F' | 'M' | 'A' (anyone), pre: item carried there, got: item carried away, carry: arms,
//        L: captions, say: lines while there }
export const SHOPS = {
  grocer: {
    n: "Kowalski's Market", tags: ['browse', 'customer'], d: [8, 16], open: [420, 1140], who: 'F', got: 'grocery_bag', food: true,
    L: ["Picking up groceries at Kowalski's", "Buying coffee and a sack of potatoes at Kowalski's", "Getting the makings of Sunday dinner at Kowalski's"],
    say: ['A pound of Maxwell House, and put it on the book, please.', 'Are those the last of the Macs? I\'ll take the lot.', 'Eggs went up again. Everything goes up but the allowance.', 'I came in for bread and I\'m leaving with half the store.'],
  },
  butcher: {
    n: "Russo's Meats", tags: ['browse', 'customer'], d: [6, 12], open: [450, 1080], who: 'F', got: 'grocery_bag', food: true,
    L: ["Getting a pot roast at Russo's for Sunday", "Buying pork chops at Russo's", "Picking up a chicken at Russo's"],
    say: ['Something nice for Sunday, Mr. Russo. Not too dear.', 'Trim the fat, would you? He leaves it on the plate anyway.', 'Save me a soup bone. For the dog. Well — for the soup.'],
  },
  bakery: {
    n: 'Halloran & Sons Bakery', tags: ['browse', 'customer'], d: [5, 10], open: [400, 780], who: 'A', got: 'grocery_bag', food: true,
    L: ["Buying a Centennial loaf at Halloran's", "Picking up rolls and a Centennial loaf at Halloran's", "Getting a Centennial loaf before they're gone"],
    say: ['Two Centennial loaves, please. One to eat and one to keep.', 'The town seal baked right on the crust! Pat Halloran\'s a marvel.', 'They\'ll be sold out by noon, you watch.', 'Four hundred loaves. The ovens were lit at half past four.'],
  },
  fish: {
    n: 'Castellano Fish Market', tags: ['browse', 'customer'], d: [6, 12], open: [420, 1020], who: 'F', got: 'grocery_bag', food: true,
    L: ["Picking up haddock for supper at Castellano's", "Buying a pound of scallops at Castellano's"],
    say: ['Is the haddock from this morning? You\'re a saint, Carmela.', 'Wrap it in the Courier, dear. I\'ve read it.', 'Sal Jr.\'s home, I hear! You must be over the moon.'],
  },
  drugstore: {
    n: "Mayhew's Pharmacy & Soda Fountain", tags: ['waiting', 'customer', 'browse'], d: [6, 14], open: [480, 1260], who: 'A',
    L: ["Picking up a prescription at Mayhew's", "Waiting on Mother's prescription at Mayhew's", "Buying aspirin and Band-Aids at Mayhew's"],
    say: ['Twice a day with meals. As if Mother eats meals.', 'And a tube of Pepsodent, while I\'m here.', 'Doc Pike says it\'s nothing. Doc Pike says that about everything.'],
  },
  dept: {
    n: "Harlow's", tags: ['browse'], d: [12, 25], open: [540, 1050], who: 'F', got: 'handbag',
    L: ["Looking at winter coats at Harlow's", "Buying school shoes at Harlow's", "Shopping at Harlow's", "Looking at the Centennial china at Harlow's"],
    say: ['Twenty-nine ninety-five for a coat! My mother wore one coat for thirty years.', 'The only escalator in the county, and I still take the stairs.', 'Just looking, thank you. Well — maybe the gloves.'],
  },
  dime: {
    n: "Woolcott's 5 & 10", tags: ['browse'], d: [6, 14], open: [540, 1080], who: 'A', got: 'flag_small',
    L: ["Buying thread and a Centennial pennant at Woolcott's", "Buying a spool of thread at Woolcott's", "Looking for birthday candles at Woolcott's"],
    say: ['Everything from thread to goldfish. I came in for thread.', 'A pennant for the porch, and one for the car aerial.', 'Seven candles and a card. The Moreau girl\'s party is at two.'],
  },
  florist: {
    n: 'Bloom & Bower Florist', tags: ['browse', 'customer'], d: [6, 12], open: [480, 1020], who: 'A', got: 'bouquet',
    L: ['Buying mums for the table at Bloom & Bower', 'Buying a bouquet at Bloom & Bower'],
    say: ['Bronze mums, please. It\'s autumn, whether we like it or not.', 'Don\'t tell me the Bower sisters are at it again.'],
  },
  laundry: {
    n: "Lee's Hand Laundry", tags: ['customer', 'shop'], d: [4, 8], open: [450, 1080], who: 'A', got: 'crate_small', carry: true,
    L: ["Picking up the shirts at Lee's", "Dropping off the tablecloths at Lee's"],
    say: ['Nobody does a collar like Mr. Lee. It stands up by itself.', 'Six shirts and the good tablecloth. The ticket\'s in here somewhere.'],
  },
  post: {
    n: 'United States Post Office', tags: ['customer', 'shop'], d: [4, 9], open: [465, 720], who: 'A', pre: 'letter',
    L: ['Mailing a letter at the post office', 'Buying three-cent stamps at the post office', 'Mailing the Centennial postcards', 'Mailing a parcel to the boy at Fort Devens'],
    say: ['A book of three-cent stamps. And the Centennial ones, if they came.', 'Does it go faster if I put two stamps on?', 'Sending my sister the program. She\'ll say Nashua does it better.'],
  },
  bank: {
    n: 'First Juniper Savings Bank', tags: ['customer', 'queue', 'bank'], d: [5, 12], open: [525, 735], who: 'A',
    L: ['Making a deposit before the bank closes at noon', 'Depositing the pay envelope at the Savings Bank', 'Putting a dollar in the Christmas Club'],
    say: ['Saturday hours, nine to noon. Nobody gets rich after lunch.', 'Put a dollar in the Christmas Club, would you?', 'Is it true the bank\'s burying a silver dollar in the capsule?'],
  },
  loan: {
    n: 'Bayside Savings & Loan', tags: ['customer', 'waiting', 'browse'], d: [6, 12], open: [540, 720], who: 'A',
    L: ['Paying the mortgage at Bayside Savings & Loan'],
    say: ['Four more years on the house. Then it\'s ours, and the roof\'s the bank\'s.'],
  },
  library: {
    n: 'Carnegie Library', tags: ['read_book', 'browse'], d: [10, 22], open: [540, 1030], who: 'A', pre: 'book', got: 'book',
    L: ['Taking the library books back', 'Choosing a mystery at the Carnegie Library', 'Looking at the Centennial exhibit at the library'],
    say: ['Two days overdue. Miss Mayhew will give me the look.', 'Another Agatha Christie. I always guess wrong and I don\'t mind.', 'They\'ve got the 1853 charter under glass upstairs.'],
  },
  hardware: {
    n: 'Garrity Hardware', tags: ['browse', 'customer'], d: [8, 16], open: [450, 1080], who: 'M', got: 'crate_small', carry: true, project: true,
    L: ["Buying screen-door hinges at Garrity's", "Buying a can of porch paint at Garrity's", "Getting a pane of glass cut at Garrity's", "Buying a new rake at Garrity's"],
    say: ['I need a hinge. The one that goes on the thing. You know.', 'Porch gray. The same gray. There\'s only one gray.', 'A pound of wood screws, and don\'t let me leave without putty.'],
  },
  tobacco: {
    n: 'Lantern Tobacco & News', tags: ['customer', 'browse'], d: [4, 9], open: [420, 1140], who: 'M', got: 'newspaper',
    L: ['Buying the Boston paper and a tin of Prince Albert', 'Picking up the Globe at Lantern Tobacco'],
    say: ['The Globe and a tin of Prince Albert. And the Sporting News, if it came.', 'The Centennial edition\'s tomorrow? Right. Right.'],
  },
  tailor: {
    n: 'Adler & Son, Tailors', tags: ['customer', 'browse'], d: [6, 14], open: [480, 1020], who: 'A',
    L: ["Picking up the good suit at Adler's", "Having trousers let out at Adler's"],
    say: ['Mr. Adler says there\'s an inch left in the seams. After that I\'m on my own.'],
  },
  shoes: {
    n: 'Beaumont Shoes', tags: ['customer', 'browse'], d: [8, 16], open: [540, 1050], who: 'A',
    L: ["Having new heels put on at Beaumont's", "Buying school shoes at Beaumont's"],
    say: ['Mr. Beaumont measures twice and sells once.'],
  },
  millinery: {
    n: 'Gould Millinery', tags: ['browse', 'waiting'], d: [10, 20], open: [540, 1020], who: 'F',
    L: ["Trying on hats at Madame Gould's", "Choosing a hat for tomorrow's service"],
    say: ['A little veil? For the Centennial service tomorrow.', 'He says a hat is a hat. He\'s worn the same one since 1938.'],
  },
  dress: {
    n: 'Silva Dress Shop', tags: ['browse', 'customer'], d: [10, 18], open: [540, 1020], who: 'F',
    L: ["Having a hem taken up at Silva's", "Trying on a dress at Silva's"],
    say: ['Mrs. Silva, be honest. No — don\'t be honest.'],
  },
  jeweler: {
    n: 'Weiss Jewelers', tags: ['customer', 'browse'], d: [6, 12], open: [540, 1020], who: 'A',
    L: ["Having Dad's pocket watch cleaned at Weiss's"],
    say: ['It was my father\'s. It loses four minutes a day, same as he did.'],
  },
  travel: {
    n: 'Bay Travel & Telegraph', tags: ['customer', 'waiting'], d: [5, 10], open: [480, 1020], who: 'A',
    L: ['Sending a telegram to Aunt Rose in Fall River'],
    say: ['“Centennial grand stop wish you were here stop.” How much is that?'],
  },
  photo: {
    n: 'Lowell Photography Studio', tags: ['browse', 'shop'], d: [5, 10], open: [540, 1020], who: 'A',
    L: ["Picking up the snapshots at Lowell's"],
    say: ['Twelve pictures and I\'ve got my eyes shut in nine.'],
  },
  bookshop: {
    n: 'Pike & Daughter Books', tags: ['browse'], d: [10, 20], open: [540, 1080], who: 'A', got: 'book',
    L: ['Browsing at Pike & Daughter Books'],
    say: ['Just one book. I said that last Saturday too.'],
  },
  radio: {
    n: 'Bay Radio & Television', tags: ['browse'], d: [8, 16], open: [540, 1080], who: 'M',
    L: ['Looking at the new television sets at Bay Radio'],
    say: ['Twenty-one inches! Pat Halloran\'s got one. We\'ll see.', 'Three hundred dollars for a box that shows wrestling.'],
  },
  chandlery: {
    n: 'Whitcomb Ship Chandlery', tags: ['browse', 'customer'], d: [8, 15], open: [420, 1020], who: 'M', got: 'crate_small', carry: true,
    L: ['Buying line and copper paint at the chandlery'],
    say: ['Copper paint and a coil of manila. The skiff\'s coming out next week.'],
  },
  tackle: {
    n: 'Nets & Tackle', tags: ['browse', 'customer'], d: [6, 12], open: [360, 1020], who: 'M',
    L: ['Buying hooks and sinkers at Nets & Tackle'],
    say: ['Stripers are running off the point. Or so they tell me every year.'],
  },
  music: {
    n: 'Bishop Music Co.', tags: ['browse', 'waiting'], d: [10, 20], open: [540, 1080], who: 'A',
    L: ["Looking through the records at Bishop's"],
    say: ['Have you got “Crying in the Chapel”? Everybody\'s got it but me.'],
  },
  candy: {
    n: 'Sweet Shoppe', tags: ['browse'], d: [5, 10], open: [540, 1080], who: 'A',
    L: ['Buying penny candy at the Sweet Shoppe'],
    say: ['Two root-beer barrels and a Mary Jane. And one for him.'],
  },
};

// errand lists by who's going and when
export const RUNS = {
  F_am: ['grocer', 'grocer', 'butcher', 'bakery', 'bakery', 'fish', 'drugstore', 'dept', 'dime', 'florist', 'laundry', 'post', 'post', 'bank', 'library', 'millinery', 'dress', 'tailor', 'shoes', 'photo', 'travel', 'loan'],
  F_pm: ['dept', 'dept', 'dime', 'drugstore', 'library', 'florist', 'fish', 'grocer', 'millinery', 'bookshop', 'jeweler', 'shoes'],
  M_am: ['hardware', 'hardware', 'tobacco', 'tobacco', 'bank', 'post', 'bakery', 'chandlery', 'tackle', 'radio', 'tailor', 'jeweler', 'library', 'drugstore', 'loan'],
  M_pm: ['hardware', 'tobacco', 'radio', 'library', 'chandlery', 'tackle', 'drugstore', 'bookshop'],
  T: ['music', 'dime', 'candy', 'library', 'bookshop', 'drugstore'],
};

export const HOME_WITH = {
  grocery_bag: ['Home with the groceries', 'Home with the shopping'],
  crate_small: ['Carrying the parcel home', 'Lugging the box home'],
  bouquet: ['Home with the flowers'],
  book: ['Home with a new library book'],
  newspaper: ['Home with the paper'],
  flag_small: ['Home with a Centennial pennant'],
  handbag: ['Home from the shops'],
  none: ['Home from the errands', 'Home again'],
};

// what people do once the parcel is home: the Saturday project (captions, act, held)
export const PROJECTS = [
  ['Fixing the screen door with the new hinges', 'hammer', null],
  ['Painting the porch rail', 'paint', 'paintbrush'],
  ['Puttying in a new window pane', 'hammer_kneel', null],
  ['Fixing the front gate', 'hammer', null],
];

// sidewalk conversations: [a, b] lines (≤ 90 chars), {x} = the other person's name
export const CHATS_F = [
  [[0, 'Did you hear the fire engine this morning? Admiral again, up the Hatches\' maple.'], [1, 'That cat has used up eight lives and three fire departments.'], [0, 'Mildred says he only does it for the attention.'], [1, 'Well. He gets it.']],
  [[0, 'Are you going to the wedding?'], [1, 'Four bridesmaids in pink taffeta. Maria Silva sewed till midnight.'], [0, 'Helen will make a lovely bride. That Brennan boy had better know it.'], [1, 'He knows it. He set the type for the announcement himself.']],
  [[0, 'Carol Kaminski went in last night. Stan\'s pacing a groove in the hospital floor.'], [1, 'First babies take their time. Mine took two days and a thunderstorm.'], [0, 'Opal Fisk has had the booties knitted since June.'], [1, 'Pink and blue both. Opal doesn\'t take chances.']],
  [[0, 'I hear Sal Castellano Jr. is home. Thin as a rail, Rosa says.'], [1, 'Rosa will fix that by Tuesday.'], [0, 'Supper for forty tonight. She\'s been rolling pasta since Thursday.'], [1, 'God bless him. Home from Korea, and in one piece.']],
  [[0, 'Is your pie in the contest?'], [1, 'Blueberry. Margaret Ashby has sixty-one pies in that tent.'], [0, 'Loretta Quimby pulled hers out. Father Garrity\'s judging.'], [1, 'After 1949? I don\'t blame her one bit.']],
  [[0, 'The Hallorans are eating supper in front of the television tonight.'], [1, 'In front of the television! What would Bridget say?'], [0, 'Bridget\'s the one who wanted it.'], [1, 'Well. Times change.']],
  [[0, 'Look at this weather. You couldn\'t order a better day.'], [1, 'Radio says clear for the fireworks.'], [0, 'The radio said that for the Fourth, and we got drowned.'], [1, 'Bring an umbrella and it won\'t rain. That\'s science.']],
  [[0, 'What are you putting in the time capsule?'], [1, 'My recipe for fish chowder. Let 2053 try and get it right.'], [0, 'I wrote a letter to my great-granddaughter. I hope she\'s nice.'], [1, 'She\'ll be a Pike. She\'ll be opinionated.']],
  [[0, 'I\'ve got to get to Kowalski\'s before the good potatoes go.'], [1, 'Ted keeps the good ones in the back. You have to ask.'], [0, 'Thirty years I\'ve shopped there and nobody told me!'], [1, 'You have to ask.']],
  [[0, 'Your Joey\'s grown a foot since Easter.'], [1, 'And eats like two of him. I can\'t keep him in shoes.'], [0, 'Wait till he\'s fifteen. You\'ll be buying groceries by the truck.'], [1, 'Don\'t I know it.']],
];
export const CHATS_M = [
  [[0, 'Sox lost again.'], [1, 'They\'ll lose tomorrow, too. That\'s what they\'re for.'], [0, 'Williams is back, though. .407 since he came home from Korea.'], [1, 'One man can\'t carry a ballclub. Although he\'s trying.']],
  [[0, 'You fishing tomorrow?'], [1, 'After church. Stripers off the point, Leo says.'], [0, 'Leo Sprague says that every week.'], [1, 'One of these weeks he\'ll be right.']],
  [[0, 'They say the cannery\'s putting on a second shift in October.'], [1, 'Casimir Novak says so, and he\'d know.'], [0, 'Good for the town.'], [1, 'Good for my brother-in-law. He\'s been on the porch since June.']],
  [[0, 'Heard Pat Halloran bought a television.'], [1, 'Twenty-one inches. The whole street\'s in his parlor every Saturday night.'], [0, 'What does Irene say?'], [1, 'Irene bakes. What\'s she going to say?']],
  [[0, 'You going to hear the Mayor at half past five?'], [1, 'Walter\'ll go on twenty minutes past the time capsule. He always does.'], [0, 'It\'s the Centennial. Give the man his twenty minutes.'], [1, 'I\'ll give him ten. The other ten I\'m at the ring toss.']],
  [[0, 'Nice day for it.'], [1, 'Can\'t complain.'], [0, 'You could.'], [1, 'I could. But I won\'t.']],
  [[0, 'You see what they want for a new Ford? Seventeen hundred dollars.'], [1, 'My \'41 Plymouth runs fine. When it runs.'], [0, 'Tremblay\'s selling Chryslers now, out on Grand.'], [1, 'Tremblay\'d sell you the road, if the town would let him.']],
];
export const VISIT_TALK = [
  [[0, 'Come in, come in. The coffee\'s on.'], [1, 'I can only stay a minute.'], [0, 'You always say that.'], [1, 'Well, maybe a small piece of that cake.']],
  [[0, 'I brought back your pie plate. And the recipe, which I ruined.'], [1, 'You didn\'t ruin it. You improved it wrong.'], [0, 'Sit down and tell me about the wedding.'], [1, 'Pink taffeta for the bridesmaids. Maria Silva\'s fingers are still sore.']],
  [[0, 'Sit, sit. He\'s out in the garage pretending to fix something.'], [1, 'Mine too. It\'s a wonder any of them get anything done.'], [0, 'More coffee?'], [1, 'Just half a cup. Oh, all right.']],
  [[0, 'Did you ever see such a day for the Centennial?'], [1, 'Not a cloud. Walter Pemberton must have friends upstairs.'], [0, 'Walter\'s friends are all at the Elks.'], [1, 'Then somebody else is praying for him.']],
  [[0, 'Your mother\'s well?'], [1, 'Eighty-two and sharper than me. She reads the Courier with a pencil.'], [0, 'Correcting it?'], [1, 'Correcting it.']],
];
export const PORCH_TALK = [
  [[0, 'Evening. Pull up a chair.'], [1, 'Just for a minute. Did you hear the band this afternoon?'], [0, 'Heard it from here. The tuba\'s a half step behind.'], [1, 'The tuba\'s always a half step behind. That\'s the tuba.']],
  [[0, 'Warm for September.'], [1, 'It won\'t last. Nothing that nice ever does.'], [0, 'You going down for the fireworks?'], [1, 'Wouldn\'t miss them. Can\'t sleep through them anyway.']],
];
export const OLD_MEN = [
  [[0, 'Your move, Ezra.'], [1, 'I know it\'s my move. I\'m thinking.'], [0, 'You\'ve been thinking since Coolidge.'], [1, 'Coolidge was a thinker. Didn\'t say much. Neither will I.']],
  [[0, 'I remember the fiftieth. 1903. They set off a cannon.'], [1, 'Broke every window on Harbor Street.'], [0, 'Best Fourth of July we ever had, and it was September.'], [1, 'They\'ll never top it. Fireworks are for children.']],
  [[0, 'Hurricane of \'38. Water up to the second step of the Custom House.'], [1, 'Third step. I painted the mark myself.'], [0, 'Second step, and you painted it high.'], [1, 'Third step.']],
];
export const CONFESS = ['Bless me, Father, for I have sinned. It\'s been a month.', 'Three Hail Marys. For the pie business, I expect.', 'I told Loretta Quimby her crust was lovely. Is that a sin?', 'Father Garrity knows my voice. I don\'t know why I whisper.'];
