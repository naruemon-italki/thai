/* =========================================================================
   sentences.js  —  Sentence Builder game data (Thai Beginner Course)
   -------------------------------------------------------------------------
   DATA ONLY. No logic lives here. Loaded BEFORE sentence-builder.js and AFTER
   the main inline script, so it shares the global scope (plain script, no
   modules). To add or edit sentences, edit THIS file only.

   Each record is SELF-CONTAINED:
     th[]   parallel array of Thai word-tokens (each becomes one tappable button)
     rom[]  parallel array of romanizations  (rom[i] matches th[i] by index)
     en     the English prompt shown above the puzzle
     less   lesson number (drives the Sentence Pool lesson chips)
     answers (OPTIONAL) array of acceptable word-orderings written as readable
             Thai token arrays. Absent => the canonical th[] order is the only
             correct answer. Present => player's arrangement is correct if it
             matches ANY listed ordering. Use only for genuinely different valid
             orders a native speaker would actually say.
     traps  (OPTIONAL) extra WRONG words mixed into the scrambled pool to make
             the puzzle harder. Same parallel-array shape as th/rom:
               traps: { th: ["ฉัน", "ค่ะ"], rom: ["chăn", "kâ"] }
             The number of answer slots is still th.length, so the player has
             to leave the traps out. Nothing can break by adding traps — anything
             doubtful is ignored and the sentence plays as if it had none:
               • traps.th and traps.rom must have the same number of entries
                 (otherwise ALL traps of that sentence are ignored);
               • every trap needs both Thai and romanization;
               • a trap must not be a real word of the sentence (or of any
                 answers[] ordering) — it would not be a trap;
               • at most 6 traps per sentence.

   RECORDED SENTENCES. To give a sentence a real voice, add a line to
   PHRASE_AUDIO in vocab-data.js whose `th` is the sentence's Thai words joined
   with NO spaces, and put the mp3 in ./audio/voice/:
       th: ["ผม", "ชื่อ", "เจมส์", "ครับ"]
       → { th: 'ผมชื่อเจมส์ครับ', audio: 'pom-chuu-james-krap.mp3' }
   The recording then plays at normal speed whenever Spoken Answer reads that
   sentence, with Thai TTS as the fallback. Traps are never part of the key.
   Run checkSentenceAudio() in the browser console: it lists which sentences
   have a recording, prints ready-to-paste PHRASE_AUDIO lines (exact keys) for
   the rest, and reports any trap problems.

   Answer checking is STRING-BASED (by displayed word sequence), never by which
   physical button — so duplicate words within a sentence are interchangeable
   automatically with no special handling.
   ========================================================================= */

const sentences = [
  // ===== LESSON 1 =====

  {
    th: ["ผม", "ชื่อ", "เจมส์", "ครับ"],
    rom: ["pŏm", "chûu", "James", "kráp"],
    en: "My name is James.",
    less: 1,
    traps: { th: ["ฉัน", "ค่ะ"], rom: ["chăn", "kâ"] }
  },
  {
    th: ["ฉัน", "ชื่อ", "แมรี", "ค่ะ"],
    rom: ["chăn", "chûu", "Mary", "kâ"],
    en: "My name is Mary.",
    less: 1,
	traps: { th: ["ผม", "ครับ"], rom: ["pŏm", "kráp"] }
  },
  {
    th: ["คุณ", "ชื่อ", "อะไร", "ครับ/คะ"],
    rom: ["kun", "chûu", "à-rai", "kráp/ká"],
    en: "What's your name?",
    less: 1
  },
  {
    th: ["ยินดี", "ที่", "ได้", "รู้จัก", "ครับ/ค่ะ"],
    rom: ["yin dee", "têe", "dâai", "róo jàk", "kráp/kâ"],
    en: "Nice to meet you.",
    less: 1
  },

  // ===== LESSON 2 =====

  {
    th: ["ผม", "มาจาก", "อเมริกา", "ครับ"],
    rom: ["pŏm", "maa jàak", "à-may-rí-gaa", "kráp"],
    en: "I am from America. (male speaker)",
    less: 2,
	traps: { th: ["ค่ะ"], rom: ["kâ"] }
  },
  {
    th: ["ผม", "มาจาก", "อังกฤษ", "ครับ"],
    rom: ["pŏm", "maa jàak", "ang-grìt", "kráp"],
    en: "I am from England. (male speaker)",
    less: 2,
	traps: { th: ["ค่ะ"], rom: ["kâ"] }
  },
  {
    th: ["ฉัน", "มาจาก", "ญี่ปุ่น", "ค่ะ"],
    rom: ["chăn", "maa jàak", "yêe-bpùn", "kâ"],
    en: "I am from Japan. (female speaker)",
    less: 2,
	traps: { th: ["ครับ"], rom: ["kráp"] }
  },
  {
    th: ["ผม", "มาจาก", "ประเทศ", "ไทย", "ครับ"],
    rom: ["pŏm", "maa jàak", "bprà-têt", "Thai", "kráp"],
    en: "I am from Thailand. (male speaker)",
    less: 2,
	traps: { th: ["ฉัน"], rom: ["chăn"] }
  },
  {
    th: ["คุณ", "มาจาก", "ที่ไหน", "ครับ"],
    rom: ["kun", "maa jàak", "têe năi", "kráp"],
    en: "Where are you from? (male speaker)",
    less: 2,
	traps: { th: ["อะไร"], rom: ["à-rai"] }
  },
  {
    th: ["คุณ", "มาจาก", "ที่ไหน", "คะ"],
    rom: ["kun", "maa jàak", "têe năi", "ká"],
    en: "Where are you from? (female speaker)",
    less: 2,
	traps: { th: ["อะไร", "ค่ะ"], rom: ["à-rai", "kâ"] }
  },
    {
    th: ["เขา", "มาจาก", "ที่ไหน", "คะ"],
    rom: ["kăo", "maa jàak", "têe năi", "ká"],
    en: "Where is he/she from? (female speaker)",
    less: 2,
	traps: { th: ["ค่ะ", "ไหม"], rom: ["kâ", "măi"] }
  },
  {
    th: ["คุณ", "สบายดี", "ไหม", "ครับ/คะ"],
    rom: ["kun", "sà-baai dee", "măi", "kráp/ká"],
    en: "How are you? / Are you fine?",
    less: 2,
	traps: { th: ["ที่ไหน"], rom: ["têe năi"] }
  },
  {
    th: ["ผม", "สบายดี", "ครับ"],
    rom: ["pŏm", "sà-baai dee", "kráp"],
    en: "I am fine. (male speaker)",
    less: 2,
	traps: { th: ["ฉัน", "ค่ะ"], rom: ["chăn", "kâ"] }
  },
  {
    th: ["ฉัน", "สบายดี", "ค่ะ"],
    rom: ["chăn", "sà-baai dee", "kâ"],
    en: "I am fine. (female speaker)",
    less: 2,
	traps: { th: ["ผม", "คะ"], rom: ["pŏm", "ká"] }
  },
  {
    th: ["เขา", "ชื่อ", "เจสสิก้า", "ครับ"],
    rom: ["kăo", "chûu", "Jessica", "kráp"],
    en: "Her name is Jessica. (male speaker)",
    less: 2,
	traps: { th: ["เรา"], rom: ["rao"] }
  },
  {
    th: ["เขา", "มาจาก", "อเมริกา", "ค่ะ"],
    rom: ["kăo", "maa jàak", "à-may-rí-gaa", "kâ"],
    en: "She/he is from America. (female speaker)",
    less: 2,
	traps: { th: ["ที่ไหน"], rom: ["têe năi"] }
  },
  {
    th: ["เขา", "ชื่อ", "อะไร", "ครับ"],
    rom: ["kăo", "chûu", "à-rai", "kráp"],
    en: "What's his/her name? (male speaker)",
    less: 2,
	traps: { th: ["ไหม"], rom: ["măi"] }
  },
  {
    th: ["เรา", "มาจาก", "ญี่ปุ่น", "ครับ"],
    rom: ["rao", "maa jàak", "yêe-bpùn", "kráp"],
    en: "We are from Japan. (male speaker)",
    less: 2,
	traps: { th: ["มา"], rom: ["maa"] }
  },
  {
  th: ["ผม", "สบายดี", "ครับ", "แล้ว", "คุณ", "ล่ะ", "ครับ"],
  rom: ["pŏm", "sà-baai dee", "kráp", "láew", "kun", "lâ", "kráp"],
  en: "I'm fine. And you? (male speaker)",
  less: 2,
  traps: { th: ["ไหม", "เขา", "ค่ะ"], rom: ["măi", "kăo", "kâ"] }
  },

  // ===== LESSON 3 (Numbers) =====

  {
  th: ["หนึ่ง", "พัน", "เก้า", "ร้อย", "แปด", "สิบ"],
  rom: ["nèung", "pan", "gâo", "rói", "bpàet", "sìp"],
  en: "1,980 (one thousand nine hundred eighty)",
  less: 3
  },
  {
  th: ["สอง", "ร้อย", "เก้า", "สิบ", "เก้า", "บาท"],
  rom: ["sŏng", "rói", "gâo", "sìp", "gâo", "bàat"],
  en: "299 THB (two hundred ninety-nine baht)",
  less: 3
  },
  {
  th: ["หก", "พัน", "สี่", "ร้อย", "ห้า", "สิบ"],
  rom: ["hòk", "pan", "sèe", "rói", "hâa", "sìp"],
  en: "6,450 (six thousand four hundred fifty)",
  less: 3
  },
  {
  th: ["สาม", "หมื่น", "สอง", "พัน", "แปด", "ร้อย"],
  rom: ["săam", "mèun", "sŏng", "pan", "bpàet", "rói"],
  en: "32,800 (thirty-two thousand eight hundred)",
  less: 3,
  traps: { th: ["สิบ"], rom: ["sìp"] }
  },
  {
  th: ["สิบ", "สอง", "จุด", "ห้า", "ล้าน"],
  rom: ["sìp", "sŏng", "jùt", "hâa", "láan"],
  en: "12.5 million (twelve point five million)",
  less: 3
  },
  {
  th: ["เจ็ด", "ร้อย", "สี่", "สิบ", "เอ็ด"],
  rom: ["jèt", "rói", "sèe", "sìp", "èt"],
  en: "741 (seven hundred forty-one)",
  less: 3
  },
  {
  th: ["หนึ่ง", "หมื่น", "สาม", "พัน", "หก", "ร้อย", "ยี่", "สิบ"],
  rom: ["nèung", "mèun", "săam", "pan", "hòk", "rói", "yêe", "sìp"],
  en: "13,620 (thirteen thousand six hundred twenty)",
  less: 3
  },
  {
  th: ["แปด", "พัน", "หนึ่ง", "ร้อย", "เก้า", "สิบ", "เก้า"],
  rom: ["bpàet", "pan", "nèung", "rói", "gâo", "sìp", "gâo"],
  en: "8,199 (eight thousand one hundred ninety-nine)",
  less: 3
  },
  {
  th: ["แปด", "ร้อย", "ยี่", "สิบ", "เอ็ด", "บาท"],
  rom: ["bpàet", "rói", "yêe", "sìp", "èt", "bàat"],
  en: "821 THB (eight hundred twenty-one)",
  less: 3
  },
  {
  th: ["หก", "พัน", "แปด", "สิบ", "เอ็ด"],
  rom: ["hòk", "pan", "bpàet", "sìp", "èt"],
  en: "6,081 (six thousand eighty-one)",
  less: 3
  },
  {
    th: ["ห้า", "จุด", "เก้า", "ห้า", "ล้าน"],
    rom: ["hâa", "jùt", "gâo", "hâa", "láan"],
    en: "5.95 million (five point nine five million)",
    less: 3
  },
    {
    th: ["สาม", "แสน", "แปด", "หมื่น", "เก้า", "พัน", "บาท"],
    rom: ["săam", "săen", "bpàet", "mèun", "gâo", "pan", "bàat"],
    en: "389,000 THB (three hundred eighty-nine thousand baht)",
    less: 3
  },
    {
    th: ["สอง", "พัน", "เจ็ด", "ร้อย", "ห้า", "สิบ"],
    rom: ["sŏng", "pan", "jèt", "rói", "hâa", "sìp"],
    en: "2,750 (two thousand seven hundred fifty)",
    less: 3
  },
    {
    th: ["สี่", "หมื่น", "ห้า", "พัน", "บาท"],
    rom: ["sèe", "mèun", "hâa", "pan", "bàat"],
    en: "45,000 THB (forty-five thousand baht)",
    less: 3,
	traps: { th: ["สิบ"], rom: ["sìp"] }
  },
  {
  th: ["หนึ่ง", "แสน", "สอง", "หมื่น", "ยี่", "สิบ", "เอ็ด"],
  rom: ["nèung", "săen", "sŏng", "mèun", "yêe", "sìp", "èt"],
  en: "120,021 (one hundred twenty thousand twenty-one)",
  less: 3,
  traps: { th: ["ศูนย์", "ร้อย", "พัน"], rom: ["sŏon", "rói", "pan"] }
  },

  // ===== LESSON 4 (Age) =====

  {
    th: ["ผม", "อายุ", "สาม", "สิบ", "ห้า", "ปี", "ครับ"],
    rom: ["pŏm", "aa-yú", "săam", "sìp", "hâa", "bpee", "kráp"],
    en: "I am 35 years old. (male speaker)",
    less: 4,
	traps: { th: ["ค่ะ", "หก"], rom: ["kâ", "hòk"] }
  },
  {
    th: ["ฉัน", "อายุ", "ยี่สิบ", "เจ็ด", "ปี", "ค่ะ"],
    rom: ["chăn", "aa-yú", "yêe-sìp", "jèt", "bpee", "kâ"],
    en: "I am 27 years old. (female speaker)",
    less: 4,
	traps: { th: ["ครับ", "สองสิบ"], rom: ["kráp", "sŏng-sìp"] }
  },
  {
    th: ["ผม", "อายุ", "ยี่สิบ", "เอ็ด", "ปี", "ครับ"],
    rom: ["pŏm", "aa-yú", "yêe-sìp", "èt", "bpee", "kráp"],
    en: "I am 21 years old. (male speaker)",
    less: 4,
	traps: { th: ["ฉัน", "หนึ่ง", "สองสิบ"], rom: ["chăn", "nèung", "sŏng-sìp"] }
  },
  {
    th: ["คุณ", "อายุ", "เท่าไหร่", "ครับ/คะ"],
    rom: ["kun", "aa-yú", "tâo rài", "kráp/ká"],
    en: "How old are you?",
    less: 4,
	traps: { th: ["อะไร"], rom: ["à-rai"] }
  },
  {
    th: ["เขา", "อายุ", "เท่าไหร่", "คะ"],
    rom: ["kăo", "aa-yú", "tâo rài", "ká"],
    en: "How old is he/she? (female speaker)",
    less: 4,
	traps: { th: ["อะไร"], rom: ["à-rai"] }
  },
  {
    th: ["เขา", "อายุ", "สาม", "สิบ", "หก", "ปี", "ครับ"],
    rom: ["kăo", "aa-yú", "săam", "sìp", "hòk", "bpee", "kráp"],
    en: "He/she is 36 years old. (male speaker)",
    less: 4,
	traps: { th: ["สี่"], rom: ["sèe"] }
  },
  {
    th: ["เขา", "อายุ", "เจ็ด", "สิบ", "เอ็ด", "ปี", "ค่ะ"],
    rom: ["kăo", "aa-yú", "jèt", "sìp", "èt", "bpee", "kâ"],
    en: "He/she is 71 years old. (female speaker)",
    less: 4,
	traps: { th: ["หนึ่ง"], rom: ["nèung"] }
  },
  {
    th: ["เขา", "มาจาก", "ประเทศ", "อังกฤษ", "ครับ"],
    rom: ["kăo", "maa jàak", "bprà-têt", "ang-grìt", "kráp"],
    en: "He/she is from England. (male speaker)",
    less: 4,
	traps: { th: ["ภาษา"], rom: ["paa-săa"] }
  },

// ===== LESSON 5 (Simple Sentences) =====

{
  th: ["ผม", "กิน", "ไก่", "ครับ"],
  rom: ["pŏm", "gin", "gài", "kráp"],
  en: "I eat chicken. (male speaker)",
  less: 5,
  traps: { th: ["หนัง"], rom: ["năng"] }
},
{
  th: ["ฉัน", "ดื่ม", "น้ำ", "ค่ะ"],
  rom: ["chăn", "dèum", "náam", "kâ"],
  en: "I drink water. (female speaker)",
  less: 5,
  traps: { th: ["ไป"], rom: ["bpai"] }
},
{
  th: ["ผม", "อ่าน", "หนังสือ", "ครับ"],
  rom: ["pŏm", "àan", "năng-sĕu", "kráp"],
  en: "I read a book. (male speaker)",
  less: 5,
  traps: { th: ["น้ำ"], rom: ["náam"] }
},
{
  th: ["เขา", "อ่าน", "หนังสือ", "ค่ะ"],
  rom: ["kăo", "àan", "năng-sĕu", "kâ"],
  en: "He/she reads a book. (female speaker)",
  less: 5,
  traps: { th: ["ดู"], rom: ["doo"] }
},
{
  th: ["เรา", "กิน", "ไก่", "ครับ"],
  rom: ["rao", "gin", "gài", "kráp"],
  en: "We eat chicken. (male speaker)",
  less: 5,
  traps: { th: ["ดื่ม"], rom: ["dèum"] }
},
{
  th: ["พวก", "เขา", "ดื่ม", "น้ำ"],
  rom: ["pûak", "kăo", "dèum", "náam"],
  en: "They drink water.",
  less: 5,
  traps: { th: ["หมู"], rom: ["mŏo"] }
},
{
  th: ["แมว", "ชอบ", "ดื่ม", "นม"],
  rom: ["maew", "chôp", "dèum", "nom"],
  en: "The cat likes to drink milk.",
  less: 5,
  traps: { th: ["น้ำ"], rom: ["náam"] }
},
{
  th: ["ผม", "กิน", "ยา", "ครับ"],
  rom: ["pŏm", "gin", "yaa", "kráp"],
  en: "I take medicine. (male speaker)",
  less: 5,
  traps: { th: ["ฉัน"], rom: ["chăn"] }
},
{
  th: ["ฉัน", "กิน", "ข้าว", "ค่ะ"],
  rom: ["chăn", "gin", "kâao", "kâ"],
  en: "I'm eating. / I eat a meal. (female speaker)",
  less: 5,
  traps: { th: ["ผม"], rom: ["pŏm"] }
},
{
  th: ["ผม", "ชอบ", "กิน", "ไก่"],
  rom: ["pŏm", "chôp", "gin", "gài"],
  en: "I like to eat chicken. (male speaker)",
  less: 5,
  traps: { th: ["ดื่ม"], rom: ["dèum"] }
},
{
  th: ["ฉัน", "ชอบ", "ดื่ม", "เบียร์"],
  rom: ["chăn", "chôp", "dèum", "bia"],
  en: "I like to drink beer. (female speaker)",
  less: 5,
  traps: { th: ["อ่าน"], rom: ["àan"] }
},
{
  th: ["เรา", "ชอบ", "แมว", "ครับ"],
  rom: ["rao", "chôp", "maew", "kráp"],
  en: "We like cats. (male speaker)",
  less: 5
},
{
  th: ["เขา", "ชอบ", "อ่าน", "หนังสือ"],
  rom: ["kăo", "chôp", "àan", "năng-sĕu"],
  en: "He/she likes to read books.",
  less: 5,
  traps: { th: ["หนัง"], rom: ["năng"] }
},
{
  th: ["ผม", "ชอบ", "กิน", "พิซซ่า", "ครับ"],
  rom: ["pŏm", "chôp", "gin", "pít-sâa", "kráp"],
  en: "I like to eat pizza. (male speaker)",
  less: 5
},
{
  th: ["ฉัน", "ชอบ", "กิน", "ซูชิ", "ค่ะ"],
  rom: ["chăn", "chôp", "gin", "soo-chí", "kâ"],
  en: "I like to eat sushi. (female speaker)",
  less: 5,
  traps: { th: ["ดื่ม"], rom: ["dèum"] }
},
{
  th: ["ผม", "ชอบ", "ดื่ม", "โค้ก"],
  rom: ["pŏm", "chôp", "dèum", "kóhk"],
  en: "I like to drink coke.",
  less: 5,
  traps: { th: ["ดู"], rom: ["doo"] }
},
{
  th: ["ผม", "ชอบ", "กิน", "อาหาร", "ไทย"],
  rom: ["pŏm", "chôp", "gin", "aa-hăan", "Thai"],
  en: "I like to eat Thai food. (male speaker)",
  less: 5,
  traps: { th: ["ดื่ม"], rom: ["dèum"] }
},
{
  th: ["เรา", "ชอบ", "กิน", "ผลไม้"],
  rom: ["rao", "chôp", "gin", "pŏn-lá-mái"],
  en: "We like to eat fruit.",
  less: 5,
  traps: { th: ["แมว"], rom: ["maew"] }
},
{
  th: ["ฉัน", "ชอบ", "กิน", "แอปเปิล"],
  rom: ["chăn", "chôp", "gin", "àep-bpêun"],
  en: "I like to eat apples. (female speaker)",
  less: 5,
  traps: { th: ["ดื่ม"], rom: ["dèum"] }
},
{
  th: ["ผม", "ชอบ", "ทำ", "งาน", "ครับ"],
  rom: ["pŏm", "chôp", "tam", "ngaan", "kráp"],
  en: "I like to work. (male speaker)",
  less: 5,
  traps: { th: ["ค่ะ", "อาหาร"], rom: ["kâ", "aa-hăan"] }
},
{
  th: ["เขา", "ชอบ", "ทำ", "อาหาร", "ค่ะ"],
  rom: ["kăo", "chôp", "tam", "aa-hăan", "kâ"],
  en: "He/she likes cooking. (female speaker)",
  less: 5,
  traps: { th: ["งาน"], rom: ["ngaan"] }
},
{
  th: ["ฉัน", "ชอบ", "ทำ", "อาหาร", "ค่ะ"],
  rom: ["chăn", "chôp", "tam", "aa-hăan", "kâ"],
  en: "I like to cook. (female speaker)",
  less: 5,
  traps: { th: ["ครับ"], rom: ["kráp"] }
},
{
  th: ["เรา", "ซื้อ", "ไก่", "ค่ะ"],
  rom: ["rao", "séu", "gài", "kâ"],
  en: "We buy chicken. (female speaker)",
  less: 5
},
{
  th: ["เขา", "ซื้อ", "ผลไม้", "ค่ะ"],
  rom: ["kăo", "séu", "pŏn-lá-mái", "kâ"],
  en: "He/she buys fruit. (female speaker)",
  less: 5,
  traps: { th: ["สี่"], rom: ["sèe"] }
},
{
  th: ["ผม", "ซื้อ", "น้ำ", "ครับ"],
  rom: ["pŏm", "séu", "náam", "kráp"],
  en: "I buy water. (male speaker)",
  less: 5,
  traps: { th: ["ฉัน"], rom: ["chăn"] }
},
{
  th: ["เขา", "ชอบ", "ทำ", "งาน", "ครับ"],
  rom: ["kăo", "chôp", "tam", "ngaan", "kráp"],
  en: "He/she likes to work. (male speaker)",
  less: 5
},
{
  th: ["ผม", "ไป", "ร้าน", "อาหาร", "ครับ"],
  rom: ["pŏm", "bpai", "ráan", "aa-hăan", "kráp"],
  en: "I go to a restaurant. (male speaker)",
  less: 5,
  traps: { th: ["ฉัน", "กิน"], rom: ["chăn", "gin"] }
},
{
  th: ["ฉัน", "ไป", "ซูเปอร์มาร์เก็ต", "ค่ะ"],
  rom: ["chăn", "bpai", "soo-bper-maa-gèt", "kâ"],
  en: "I go to a supermarket. (female speaker)",
  less: 5,
  traps: { th: ["ผม"], rom: ["pŏm"] }
},
{
  th: ["เรา", "ไป", "ออฟฟิศ"],
  rom: ["rao", "bpai", "óf-fít"],
  en: "We go to the office.",
  less: 5,
  traps: { th: ["อ่าน"], rom: ["àan"] }
},
{
  th: ["ผม", "เรียน", "ภาษา", "ไทย", "ครับ"],
  rom: ["pŏm", "rian", "paa-săa", "Thai", "kráp"],
  en: "I study Thai language. (male speaker)",
  less: 5,
  traps: { th: ["ประเทศ"], rom: ["bprà-têt"] }
},
{
  th: ["ฉัน", "เรียน", "ภาษา", "ไทย", "ค่ะ"],
  rom: ["chăn", "rian", "paa-săa", "Thai", "kâ"],
  en: "I study Thai language. (female speaker)",
  less: 5,
  traps: { th: ["ประเทศ", "ผม"], rom: ["bprà-têt", "pŏm"] }
},
{
  th: ["ฉัน", "ซื้อ", "อาหาร", "ค่ะ"],
  rom: ["chăn", "séu", "aa-hăan", "kâ"],
  en: "I buy food. (female speaker)",
  less: 5,
  traps: { th: ["ครับ"], rom: ["kráp"] }
},
{
  th: ["เขา", "ชอบ", "กิน", "อาหาร", "อเมริกัน"],
  rom: ["kăo", "chôp", "gin", "aa-hăan", "à-may-rí-gan"],
  en: "He/she likes to eat American food.",
  less: 5,
  traps: { th: ["ฟัง"], rom: ["fang"] }
},
{
  th: ["เรา", "ชอบ", "กิน", "อาหาร", "ไทย", "ครับ"],
  rom: ["rao", "chôp", "gin", "aa-hăan", "thai", "kráp"],
  en: "We like to eat Thai food. (male speaker)",
  less: 5
},
{
  th: ["พวก", "เขา", "ชอบ", "กิน", "อาหาร", "อิตาลี"],
  rom: ["pûak", "kăo", "chôp", "gin", "aa-hăan", "ì-dtaa-lee"],
  en: "They like to eat Italian food.",
  less: 5
},
{
  th: ["เรา", "ชอบ", "ไป", "ร้าน", "อาหาร", "จีน"],
  rom: ["rao", "chôp", "bpai", "ráan", "aa-hăan", "jeen"],
  en: "We like to go to Chinese restaurants.",
  less: 5,
  traps: { th: ["ประเทศ", "มา"], rom: ["bprà-têt", "maa"] }
},

// ===== LESSON 6 (Questions) =====
{
  th: ["คุณ", "ชอบ", "แมว", "ไหม"],
  rom: ["kun", "chôp", "maew", "măi"],
  en: "Do you like cats?",
  less: 6
},
{
  th: ["คุณ", "ชอบ", "อ่าน", "หนังสือ", "ไหม"],
  rom: ["kun", "chôp", "àan", "năng-sĕu", "măi"],
  en: "Do you like reading books?",
  less: 6,
  traps: { th: ["หนัง"], rom: ["năng"] }
},
{
  th: ["คุณ", "ชอบ", "ทำ", "อาหาร", "ไหม"],
  rom: ["kun", "chôp", "tam", "aa-hăan", "măi"],
  en: "Do you like cooking?",
  less: 6
},
{
  th: ["คุณ", "ชอบ", "หมา", "ไหม"],
  rom: ["kun", "chôp", "măa", "măi"],
  en: "Do you like dogs?",
  less: 6,
  traps: { th: ["มา"], rom: ["maa"] }
},
{
  th: ["คุณ", "ชอบ", "ออกกำลังกาย", "ไหม"],
  rom: ["kun", "chôp", "òk gam-lang gaai", "măi"],
  en: "Do you like exercising?",
  less: 6
},
{
  th: ["คุณ", "ชอบ", "กิน", "พิซซ่า", "ไหม"],
  rom: ["kun", "chôp", "gin", "pít-sâa", "măi"],
  en: "Do you like eating pizza?",
  less: 6
},
{
  th: ["คุณ", "ชอบ", "ดื่ม", "เบียร์", "ไหม"],
  rom: ["kun", "chôp", "dèum", "bia", "măi"],
  en: "Do you like drinking beer?",
  less: 6,
  traps: { th: ["กิน"], rom: ["gin"] }
},
{
  th: ["คุณ", "ชอบ", "กิน", "อาหาร", "ไทย", "ไหม", "คะ"],
  rom: ["kun", "chôp", "gin", "aa-hăan", "Thai", "măi", "ká"],
  en: "Do you like eating Thai food? (female)",
  less: 6
},
{
  th: ["คุณ", "ชอบ", "ดู", "หนัง", "ไหม"],
  rom: ["kun", "chôp", "doo", "năng", "măi"],
  en: "Do you like watching movies?",
  less: 6,
  traps: { th: ["หนังสือ", "เห็น"], rom: ["năng-sĕu", "hĕn"] }
},
{
  th: ["คุณ", "ชอบ", "ฟัง", "เพลง", "ไหม"],
  rom: ["kun", "chôp", "fang", "pleng", "măi"],
  en: "Do you like listening to music?",
  less: 6,
  traps: { th: ["ได้ยิน"], rom: ["dâai yin"] }
},
{
  th: ["เขา", "ชอบ", "ดื่ม", "เบียร์", "ไหม"],
  rom: ["kăo", "chôp", "dèum", "bia", "măi"],
  en: "Does he/she like to drink beer?",
  less: 6,
  traps: { th: ["ไป"], rom: ["bpai"] }
},
{
  th: ["คุณ", "ชอบ", "เล่น", "โทรศัพท์", "ไหม"],
  rom: ["kun", "chôp", "lên", "toh-rá-sàp", "măi"],
  en: "Do you like to use your phone?",
  less: 6,
  traps: { th: ["กิน"], rom: ["gin"] }
},
{
  th: ["คุณ", "กิน", "อะไร", "ครับ"],
  rom: ["kun", "gin", "à-rai", "kráp"],
  en: "What are you eating? (male)",
  less: 6
},
{
  th: ["คุณ", "ชอบ", "กิน", "อะไร", "คะ"],
  rom: ["kun", "chôp", "gin", "à-rai", "ká"],
  en: "What do you like to eat? (female)",
  less: 6
},
{
  th: ["คุณ", "ชอบ", "ดื่ม", "อะไร", "ครับ"],
  rom: ["kun", "chôp", "dèum", "à-rai", "kráp"],
  en: "What do you like to drink? (male)",
  less: 6
},
{
  th: ["คุณ", "ชอบ", "ทำ", "อะไร"],
  rom: ["kun", "chôp", "tam", "à-rai"],
  en: "What do you like to do?",
  less: 6,
  traps: { th: ["ไหม"], rom: ["măi"] }
},
{
  th: ["คุณ", "ชอบ", "อ่าน", "หนังสือ", "อะไร"],
  rom: ["kun", "chôp", "àan", "năng-sĕu", "à-rai"],
  en: "What do you like to read?",
  less: 6,
  traps: { th: ["กิน"], rom: ["gin"] }
},
{
  th: ["คุณ", "ชอบ", "ดู", "หนัง", "อะไร"],
  rom: ["kun", "chôp", "doo", "năng", "à-rai"],
  en: "What kind of movies do you like to watch?",
  less: 6,
  traps: { th: ["หนังสือ"], rom: ["năng-sĕu"] }
},
{
  th: ["คุณ", "ชอบ", "ฟัง", "เพลง", "อะไร"],
  rom: ["kun", "chôp", "fang", "pleng", "à-rai"],
  en: "What kind of music do you like to listen to?",
  less: 6,
  traps: { th: ["ดู"], rom: ["doo"] }
},
{
  th: ["เขา", "ไป", "ไหน", "คะ"],
  rom: ["kăo", "bpai", "năi", "ká"],
  en: "Where is he/she going?",
  less: 6,
  traps: { th: ["อะไร", "ข้าว"], rom: ["à-rai", "kâao"] }
},
{
  th: ["ผม", "ชอบ", "ดู", "หนัง", "และ", "ฟัง", "เพลง"],
  rom: ["pŏm", "chôp", "doo", "năng", "láe", "fang", "pleng"],
  en: "I like to watch movies and listen to music.",
  less: 6,
  answers: [
    ["ผม", "ชอบ", "ดู", "หนัง", "และ", "ฟัง", "เพลง"],
    ["ผม", "ชอบ", "ฟัง", "เพลง", "และ", "ดู", "หนัง"]
  ],
  traps: { th: ["แล้ว"], rom: ["láew"] }
},
{
  th: ["ฉัน", "ชอบ", "หมา", "และ", "แมว"],
  rom: ["chăn", "chôp", "măa", "láe", "maew"],
  en: "I like dogs and cats.",
  less: 6,
  answers: [
    ["ฉัน", "ชอบ", "หมา", "และ", "แมว"],
    ["ฉัน", "ชอบ", "แมว", "และ", "หมา"]
  ],
  traps: { th: ["แล้ว"], rom: ["láew"] }
},
{
  th: ["เรา", "กิน", "ไก่", "และ", "ดื่ม", "เบียร์"],
  rom: ["rao", "gin", "gài", "láe", "dèum", "bia"],
  en: "We eat chicken and drink beer.",
  less: 6,
  answers: [
    ["เรา", "กิน", "ไก่", "และ", "ดื่ม", "เบียร์"],
    ["เรา", "ดื่ม", "เบียร์", "และ", "กิน", "ไก่"]
  ],
  traps: { th: ["แล้ว"], rom: ["láew"] }
},
{
  th: ["ผม", "กิน", "ไก่", "และ", "ดื่ม", "น้ำ"],
  rom: ["pŏm", "gin", "gài", "láe", "dèum", "náam"],
  en: "I eat chicken and drink water.",
  less: 6,
  answers: [
    ["ผม", "กิน", "ไก่", "และ", "ดื่ม", "น้ำ"],
    ["ผม", "ดื่ม", "น้ำ", "และ", "กิน", "ไก่"]
  ],
  traps: { th: ["แล้ว"], rom: ["láew"] }
},
{
  th: ["ฉัน", "ชอบ", "กิน", "อาหาร", "ไทย", "และ", "อาหาร", "ญี่ปุ่น"],
  rom: ["chăn", "chôp", "gin", "aa-hăan", "Thai", "láe", "aa-hăan", "yêe-bpùn"],
  en: "I like to eat Thai and Japanese food.",
  less: 6,
  answers: [
    ["ฉัน", "ชอบ", "กิน", "อาหาร", "ไทย", "และ", "อาหาร", "ญี่ปุ่น"],
    ["ฉัน", "ชอบ", "กิน", "อาหาร", "ญี่ปุ่น", "และ", "อาหาร", "ไทย"]
  ],
  traps: { th: ["แล้ว", "ภาษา"], rom: ["láew", "paa-săa"] }
},
{
  th: ["ฉัน", "ซื้อ", "อาหาร", "น้ำ", "และ", "เบียร์"],
  rom: ["chăn", "séu", "aa-hăan", "náam", "láe", "bia"],
  en: "I buy food, water and beer.",
  less: 6,
  answers: [
    ["ฉัน", "ซื้อ", "อาหาร", "น้ำ", "และ", "เบียร์"],
    ["ฉัน", "ซื้อ", "อาหาร", "เบียร์", "และ", "น้ำ"],
    ["ฉัน", "ซื้อ", "น้ำ", "อาหาร", "และ", "เบียร์"],
    ["ฉัน", "ซื้อ", "น้ำ", "เบียร์", "และ", "อาหาร"],
    ["ฉัน", "ซื้อ", "เบียร์", "อาหาร", "และ", "น้ำ"],
    ["ฉัน", "ซื้อ", "เบียร์", "น้ำ", "และ", "อาหาร"]
  ]
},
{
  th: ["คุณ", "ชอบ", "ดู", "หนัง", "และ", "ฟัง", "เพลง", "ใช่", "ไหม"],
  rom: ["kun", "chôp", "doo", "năng", "láe", "fang", "pleng", "châi", "măi"],
  en: "You like watching movies and listening to music, right?",
  less: 6,
  answers: [
    ["คุณ", "ชอบ", "ดู", "หนัง", "และ", "ฟัง", "เพลง", "ใช่", "ไหม"],
    ["คุณ", "ชอบ", "ฟัง", "เพลง", "และ", "ดู", "หนัง", "ใช่", "ไหม"]
  ],
  traps: { th: ["หนังสือ", "ได้ยิน", "แล้ว"], rom: ["năng-sĕu", "dâai yin", "láew"] }
},
{
  th: ["คุณ", "ชอบ", "หมา", "ใช่", "ไหม"],
  rom: ["kun", "chôp", "măa", "châi", "măi"],
  en: "You like dogs, right?",
  less: 6,
  traps: { th: ["มา"], rom: ["maa"] }
},
{
  th: ["คุณ", "ชอบ", "ดู", "หนัง", "ใช่", "ไหม"],
  rom: ["kun", "chôp", "doo", "năng", "châi", "măi"],
  en: "You like to watch movies, right?",
  less: 6,
  traps: { th: ["หนังสือ"], rom: ["năng-sĕu"] }
},
{
  th: ["คุณ", "ชอบ", "กิน", "อาหาร", "ไทย", "ใช่", "ไหม"],
  rom: ["kun", "chôp", "gin", "aa-hăan", "Thai", "châi", "măi"],
  en: "You like to eat Thai food, right?",
  less: 6,
  traps: { th: ["อะไร"], rom: ["à-rai"] }
},
{
  th: ["คุณ", "มาจาก", "อเมริกา", "ใช่", "ไหม"],
  rom: ["kun", "maa jàak", "à-may-rí-gaa", "châi", "măi"],
  en: "You are from America, right?",
  less: 6,
  traps: { th: ["ไหน"], rom: ["năi"] }
},
{
  th: ["คุณ", "อายุ", "สาม", "สิบ", "ปี", "ใช่", "ไหม"],
  rom: ["kun", "aa-yú", "săam", "sìp", "bpee", "châi", "măi"],
  en: "You are 30 years old, right?",
  less: 6,
  traps: { th: ["ชื่อ"], rom: ["chûu"] }
},
{
  th: ["คุณ", "ชอบ", "อ่าน", "ใช่", "ไหม"],
  rom: ["kun", "chôp", "àan", "châi", "măi"],
  en: "You like to read, right?",
  less: 6
},
{
  th: ["พวก", "เขา", "ชอบ", "เล่น", "โทรศัพท์"],
  rom: ["pûak", "kăo", "chôp", "lên", "toh-rá-sàp"],
  en: "They like to use their phones.",
  less: 6,
  traps: { th: ["เห็น"], rom: ["hĕn"] }
},
{
  th: ["ฉัน", "ชอบ", "ออกกำลังกาย", "และ", "ทำ", "งาน"],
  rom: ["chăn", "chôp", "òk gam-lang gaai", "láe", "tam", "ngaan"],
  en: "I like exercising and working.",
  less: 6,
  answers: [
    ["ฉัน", "ชอบ", "ออกกำลังกาย", "และ", "ทำ", "งาน"],
    ["ฉัน", "ชอบ", "ทำ", "งาน", "และ", "ออกกำลังกาย"]
  ]
},

// ===== LESSON 7 (Negatives) =====
{
  th: ["ผม", "ไม่", "ชอบ", "กิน", "ปลา"],
  rom: ["pŏm", "mâi", "chôp", "gin", "bplaa"],
  en: "I don't like to eat fish.",
  less: 7,
  traps: { th: ["ทำงาน"], rom: ["tam ngaan"] }
},
{
  th: ["ฉัน", "ไม่", "กิน", "เนื้อ", "และ", "หมู"],
  rom: ["chăn", "mâi", "gin", "néua", "láe", "mŏo"],
  en: "I don't eat beef and pork.",
  answers: [
    ["ฉัน", "ไม่", "กิน", "เนื้อ", "และ", "หมู"],
    ["ฉัน", "ไม่", "กิน", "หมู", "และ", "เนื้อ"]
  ],
  traps: { th: ["แล้ว"], rom: ["láew"] },
  less: 7
},
{
  th: ["เขา", "ไม่", "ชอบ", "กิน", "หมู"],
  rom: ["kăo", "mâi", "chôp", "gin", "mŏo"],
  en: "He/she doesn't like to eat pork.",
  less: 7,
  traps: { th: ["ไป"], rom: ["bpai"] }
},
{
  th: ["ผม", "ไม่", "ชอบ", "ออกกำลังกาย"],
  rom: ["pŏm", "mâi", "chôp", "òk gam-lang gaai"],
  en: "I don't like to exercise.",
  less: 7,
  traps: { th: ["ไหม"], rom: ["măi"] }
},
{
  th: ["ฉัน", "ไม่", "ชอบ", "ทำ", "อาหาร"],
  rom: ["chăn", "mâi", "chôp", "tam", "aa-hăan"],
  en: "I don't like to cook.",
  less: 7,
  traps: { th: ["เล่น"], rom: ["lên"] }
},
{
  th: ["เขา", "ไม่", "ชอบ", "เรียน", "ภาษา", "อังกฤษ"],
  rom: ["kăo", "mâi", "chôp", "rian", "paa-săa", "ang-grìt"],
  en: "He/she doesn't like studying English.",
  less: 7,
  traps: { th: ["อาหาร"], rom: ["aa-hăan"] }
},
{
  th: ["พวกเขา", "ไม่", "ชอบ", "กิน", "อาหาร", "ไทย"],
  rom: ["pûak kăo", "mâi", "chôp", "gin", "aa-hăan", "Thai"],
  en: "They don't like to eat Thai food.",
  less: 7,
  traps: { th: ["เรียน"], rom: ["rian"] }
},
{
  th: ["ผม", "ไม่", "เห็น", "คุณ", "ครับ"],
  rom: ["pŏm", "mâi", "hĕn", "kun", "kráp"],
  en: "I don't see you. (male)",
  less: 7,
  traps: { th: ["ดู"], rom: ["doo"] }
},
{
  th: ["ฉัน", "ไม่", "ได้ยิน", "คุณ", "ค่ะ"],
  rom: ["chăn", "mâi", "dâai yin", "kun", "kâ"],
  en: "I don't hear you. (female)",
  less: 7,
  traps: { th: ["เห็น", "พูด"], rom: ["hĕn", "pôot"] }
},
{
  th: ["คุณ", "เห็น", "ผม", "ไหม"],
  rom: ["kun", "hĕn", "pŏm", "măi"],
  en: "Do you see me?",
  less: 7,
  traps: { th: ["ดู"], rom: ["doo"] }
},
{
  th: ["คุณ", "ได้ยิน", "ฉัน", "ไหม", "คะ"],
  rom: ["kun", "dâai yin", "chăn", "măi", "ká"],
  en: "Do you hear me?",
  less: 7,
  traps: { th: ["เห็น"], rom: ["hĕn"] }
},
{
  th: ["เขา", "ไม่", "เห็น", "ผม"],
  rom: ["kăo", "mâi", "hĕn", "pŏm"],
  en: "He/she doesn't see me.",
  less: 7,
  traps: { th: ["ดู", "ได้ยิน"], rom: ["doo", "dâai yin"] }
},
{
  th: ["ผม", "ไม่", "พูด", "ภาษา", "ฝรั่งเศส"],
  rom: ["pŏm", "mâi", "pôot", "paa-săa", "fà-ràng-sèt"],
  en: "I don't speak French.",
  less: 7,
  traps: { th: ["คุย"], rom: ["kui"] }
},
{
  th: ["ฉัน", "พูด", "ภาษา", "ญี่ปุ่น"],
  rom: ["chăn", "pôot", "paa-săa", "yêe-bpùn"],
  en: "I speak Japanese.",
  less: 7,
  traps: { th: ["ประเทศ", "บอก"], rom: ["bprà-têt", "bòk"] }
},
{
  th: ["เขา", "ไม่", "พูด", "ภาษา", "อังกฤษ"],
  rom: ["kăo", "mâi", "pôot", "paa-săa", "ang-grìt"],
  en: "He/she doesn't speak English.",
  less: 7,
  traps: { th: ["ไหม"], rom: ["măi"] }
},
{
  th: ["ฉัน", "ไม่", "บอก", "คุณ"],
  rom: ["chăn", "mâi", "bòk", "kun"],
  en: "I won't tell you.",
  less: 7,
  traps: { th: ["ไหม", "คุย"], rom: ["măi", "kui"] }
},
{
  th: ["ผม", "ไม่", "เข้าใจ", "ครับ"],
  rom: ["pŏm", "mâi", "kâo jai", "kráp"],
  en: "I don't understand.",
  less: 7,
  traps: { th: ["ไหม", "รู้จัก"], rom: ["măi", "róo jàk"] }
},
{
  th: ["หมา", "ไม่", "ชอบ", "กิน", "ผัก"],
  rom: ["măa", "mâi", "chôp", "gin", "pàk"],
  en: "Dogs don't like eating vegetables.",
  less: 7,
  traps: { th: ["ไก่"], rom: ["gài"] }
},
{
  th: ["พวก", "เขา", "ซื้อ", "เนื้อ", "วัว", "และ", "ผัก"],
  rom: ["pûak", "kăo", "séu", "néua", "wuua", "láe", "pàk"],
  en: "They buy beef and vegetables.",
  less: 7,
  answers: [
    ["พวก", "เขา", "ซื้อ", "เนื้อ", "วัว", "และ", "ผัก"],
    ["พวก", "เขา", "ซื้อ", "ผัก", "และ", "เนื้อ", "วัว"]
  ],
  traps: { th: ["มา"], rom: ["maa"] }
},
{
  th: ["คุณ", "เข้าใจ", "ไหม", "ครับ"],
  rom: ["kun", "kâo jai", "măi", "kráp"],
  en: "Do you understand? (male speaker)",
  less: 7,
  traps: { th: ["รู้จัก"], rom: ["róo jàk"] }
},
{
  th: ["พวก", "เขา", "ไม่", "เข้าใจ", "ภาษา", "ไทย"],
  rom: ["pûak", "kăo", "mâi", "kâo jai", "paa-săa", "Thai"],
  en: "They don't understand Thai.",
  less: 7,
  traps: { th: ["ข้าว"], rom: ["kâao"] }
},
{
  th: ["ผม", "รู้จัก", "เขา"],
  rom: ["pŏm", "róo jàk", "kăo"],
  en: "I know him/her.",
  less: 7,
  traps: { th: ["รู้", "ข้าว"], rom: ["róo", "kâao"] }
},
{
  th: ["เขา", "ไม่", "รู้จัก", "ผม"],
  rom: ["kăo", "mâi", "róo jàk", "pŏm"],
  en: "He/she doesn't know me.",
  less: 7,
  traps: { th: ["รู้", "เจอ"], rom: ["róo", "jer"] }
},
{
  th: ["ฉัน", "รู้จัก", "คุณ", "ใช่", "ไหม"],
  rom: ["chăn", "róo jàk", "kun", "châi", "măi"],
  en: "I know you, right?",
  less: 7,
  traps: { th: ["รู้"], rom: ["róo"] }
},
{
  th: ["ฉัน", "ไม่", "รัก", "เขา"],
  rom: ["chăn", "mâi", "rák", "kăo"],
  en: "I don't love him/her.",
  less: 7,
  traps: { th: ["ข้าว"], rom: ["kâao"] }
},
{
  th: ["ผม", "ชอบ", "กิน", "แต่", "ไม่", "ชอบ", "ทำ", "อาหาร"],
  rom: ["pŏm", "chôp", "gin", "dtàe", "mâi", "chôp", "tam", "aa-hăan"],
  en: "I like to eat, but I don't like to cook.",
  less: 7
},
{
  th: ["ฉัน", "ชอบ", "เล่น", "แต่", "ไม่", "ชอบ", "เรียน"],
  rom: ["chăn", "chôp", "lên", "dtàe", "mâi", "chôp", "rian"],
  en: "I like to play, but I don't like to study.",
  less: 7
},
{
  th: ["ผม", "ชอบ", "กิน", "เนื้อ", "แต่", "ไม่", "ชอบ", "กิน", "ไก่"],
  rom: ["pŏm", "chôp", "gin", "néua", "dtàe", "mâi", "chôp", "gin", "gài"],
  en: "I like to eat beef, but I don't like to eat chicken.",
  less: 7,
  traps: { th: ["และ"], rom: ["láe"] }
},
{
  th: ["ฉัน", "ชอบ", "หมา", "แต่", "ไม่", "ชอบ", "แมว"],
  rom: ["chăn", "chôp", "măa", "dtàe", "mâi", "chôp", "maew"],
  en: "I like dogs, but I don't like cats.",
  less: 7
},
{
  th: ["เขา", "รู้จัก", "ผม", "แต่", "ไม่", "ชอบ"],
  rom: ["kăo", "róo jàk", "pŏm", "dtàe", "mâi", "chôp"],
  en: "He/she knows me, but doesn't like me.",
  less: 7,
  traps: { th: ["รู้"], rom: ["róo"] }
},
{
  th: ["ผม", "ชอบ", "ดื่ม", "เบียร์", "แต่", "ไม่", "ชอบ", "ดื่ม", "นม"],
  rom: ["pŏm", "chôp", "dèum", "bia", "dtàe", "mâi", "chôp", "dèum", "nom"],
  en: "I like to drink beer, but I don't like to drink milk.",
  less: 7,
  traps: { th: ["กิน"], rom: ["gin"] }
},
{
  th: ["เรา", "ชอบ", "กิน", "ปลา", "และ", "ผัก"],
  rom: ["rao", "chôp", "gin", "bplaa", "láe", "pàk"],
  en: "We like to eat fish and vegetables.",
  less: 7,
  answers: [
    ["เรา", "ชอบ", "กิน", "ปลา", "และ", "ผัก"],
    ["เรา", "ชอบ", "กิน", "ผัก", "และ", "ปลา"]
  ],
  traps: { th: ["ดื่ม", "ผลไม้"], rom: ["dèum", "pŏn-lá-mái"] }
},
{
  th: ["เขา", "ไม่", "ชอบ", "กิน", "หมู", "และ", "เนื้อ"],
  rom: ["kăo", "mâi", "chôp", "gin", "mŏo", "láe", "néua"],
  en: "He/she doesn't like to eat pork and beef.",
  less: 7,
  answers: [
    ["เขา", "ไม่", "ชอบ", "กิน", "หมู", "และ", "เนื้อ"],
    ["เขา", "ไม่", "ชอบ", "กิน", "เนื้อ", "และ", "หมู"]
  ],
  traps: { th: ["ปลา"], rom: ["bplaa"] }
},
{
  th: ["คุณ", "ดู", "มีความสุข"],
  rom: ["kun", "doo", "mee kwaam sùk"],
  en: "You look happy.",
  less: 7,
  traps: { th: ["เห็น", "ตื่นเต้น"], rom: ["hĕn", "dtèun dtên"] }
},
{
  th: ["เขา", "โกรธ", "ใช่", "ไหม"],
  rom: ["kăo", "gròht", "châi", "măi"],
  en: "He/she is angry, right?",
  less: 7,
  traps: { th: ["กังวล", "เศร้า"], rom: ["gang-won", "sâo"] }
},
{
  th: ["พวก", "เขา", "ดู", "ไม่", "มีความสุข"],
  rom: ["pûak", "kăo", "doo", "mâi", "mee kwaam sùk"],
  en: "They don't look happy.",
  less: 7,
  traps: { th: ["เห็น", "ดีใจ"], rom: ["hĕn", "dee jai"] }
},
{
  th: ["ผม", "ไม่", "โกรธ", "ครับ"],
  rom: ["pŏm", "mâi", "gròht", "kráp"],
  en: "I'm not angry. (male speaker)",
  less: 7,
  traps: { th: ["กลัว", "กังวล"], rom: ["glua", "gang-won"] }
},
{
  th: ["เรา", "ไม่", "กังวล", "ครับ"],
  rom: ["rao", "mâi", "gang-won", "kráp"],
  en: "We are not worried. (male speaker)",
  less: 7,
  traps: { th: ["กลัว", "โกรธ"], rom: ["glua", "gròht"] }
},
{
  th: ["ฉัน", "มีความสุข", "แต่", "เหนื่อย", "ค่ะ"],
  rom: ["chăn", "mee kwaam sùk", "dtàe", "nèuay", "kâ"],
  en: "I'm happy but tired. (female speaker)",
  less: 7,
  traps: { th: ["ตื่นเต้น"], rom: ["dtèun dtên"] }
},
{
  th: ["พวก", "เขา", "มีความสุข", "และ", "ตื่นเต้น"],
  rom: ["pûak", "kăo", "mee kwaam sùk", "láe", "dtèun dtên"],
  en: "They are happy and excited.",
  less: 7,
  answers: [
    ["พวก", "เขา", "มีความสุข", "และ", "ตื่นเต้น"],
    ["พวก", "เขา", "ตื่นเต้น", "และ", "มีความสุข"]
  ],
  traps: { th: ["เศร้า"], rom: ["sâo"] }
},
{
  th: ["เขา", "กลัว", "และ", "กังวล"],
  rom: ["kăo", "glua", "láe", "gang-won"],
  en: "He/she is scared and worried.",
  less: 7,
  answers: [
    ["เขา", "กลัว", "และ", "กังวล"],
    ["เขา", "กังวล", "และ", "กลัว"]
  ],
  traps: { th: ["แล้ว", "เหนื่อย"], rom: ["láew", "nèuay"] }
},
{
  th: ["คุณ", "ดู", "เหนื่อย", "และ", "เศร้า"],
  rom: ["kun", "doo", "nèuay", "láe", "sâo"],
  en: "You look tired and sad.",
  less: 7,
  answers: [
    ["คุณ", "ดู", "เหนื่อย", "และ", "เศร้า"],
    ["คุณ", "ดู", "เศร้า", "และ", "เหนื่อย"]
  ],
  traps: { th: ["มีความสุข"], rom: ["mee kwaam sùk"] }
},
{
  th: ["คุณ", "กลัว", "ใช่", "ไหม"],
  rom: ["kun", "glua", "châi", "măi"],
  en: "You are scared, right?",
  less: 7,
  traps: { th: ["โกรธ", "กังวล"], rom: ["gròht", "gang-won"] }
},
{
  th: ["พรุ่งนี้", "ฉัน", "จะ", "ไป", "ทำ", "งาน", "ค่ะ"],
  rom: ["prûng-née", "chăn", "jà", "bpai", "tam", "ngaan", "kâ"],
  en: "Tomorrow I will go to work.",
  less: 7,
  answers: [
    ["พรุ่งนี้", "ฉัน", "จะ", "ไป", "ทำ", "งาน", "ค่ะ"],
    ["ฉัน", "จะ", "ไป", "ทำ", "งาน", "พรุ่งนี้", "ค่ะ"]
  ],
  traps: { th: ["อาหาร"], rom: ["aa-hăan"] }
},
{
  th: ["คืนนี้", "ผม", "จะ", "เรียน", "ภาษา", "ไทย"],
  rom: ["keun née", "pŏm", "jà", "rian", "paa-săa", "thai"],
  en: "Tonight I will study Thai.",
  less: 7,
  answers: [
    ["คืนนี้", "ผม", "จะ", "เรียน", "ภาษา", "ไทย"],
    ["ผม", "จะ", "เรียน", "ภาษา", "ไทย", "คืนนี้"]
  ],
  traps: { th: ["อาหาร"], rom: ["aa-hăan"] }
},
{
  th: ["พรุ่งนี้", "เรา", "จะ", "ไป", "ประเทศ", "จีน"],
  rom: ["prûng-née", "rao", "jà", "bpai", "bprà-têt", "jeen"],
  en: "Tomorrow we will go to China.",
  less: 7,
  answers: [
    ["พรุ่งนี้", "เรา", "จะ", "ไป", "ประเทศ", "จีน"],
    ["เรา", "จะ", "ไป", "ประเทศ", "จีน", "พรุ่งนี้"]
  ],
  traps: { th: ["ภาษา", "คืนนี้"], rom: ["paa-săa", "keun née"] }
},
{
  th: ["วันนี้", "ฉัน", "จะ", "ทำ", "อาหาร", "ไทย"],
  rom: ["wan née", "chăn", "jà", "tam", "aa-hăan", "thai"],
  en: "Today I will cook Thai food.",
  less: 7,
  answers: [
    ["วันนี้", "ฉัน", "จะ", "ทำ", "อาหาร", "ไทย"],
    ["ฉัน", "จะ", "ทำ", "อาหาร", "ไทย", "วันนี้"]
  ],
  traps: { th: ["ภาษา"], rom: ["paa-săa"] }
},
{
  th: ["ผม", "จะ", "ไม่", "ไป", "ทำ", "งาน", "พรุ่งนี้"],
  rom: ["pŏm", "jà", "mâi", "bpai", "tam", "ngaan", "prûng-née"],
  en: "I will not go to work tomorrow.",
  less: 7,
  answers: [
    ["ผม", "จะ", "ไม่", "ไป", "ทำ", "งาน", "พรุ่งนี้"],
    ["พรุ่งนี้", "ผม", "จะ", "ไม่", "ไป", "ทำ", "งาน"]
  ]
},
{
  th: ["คืนนี้", "จะ", "ทำ", "อะไร", "ครับ"],
  rom: ["keun née", "jà", "tam", "à-rai", "kráp"],
  en: "What will you do tonight? (male)",
  less: 7,
  answers: [
    ["คืนนี้", "จะ", "ทำ", "อะไร", "ครับ"],
	["จะ", "ทำ", "อะไร", "คืนนี้", "ครับ"]
  ],
  traps: { th: ["ไหน", "พรุ่งนี้"], rom: ["năi", "prûng-née"] }
},
{
  th: ["พรุ่งนี้", "คุณ", "จะ", "ทำ", "อะไร", "คะ"],
  rom: ["prûng-née", "kun", "jà", "tam", "à-rai", "ká"],
  en: "What will you do tomorrow? (female)",
  less: 7,
  answers: [
    ["พรุ่งนี้", "คุณ", "จะ", "ทำ", "อะไร", "คะ"],
    ["คุณ", "จะ", "ทำ", "อะไร", "พรุ่งนี้", "คะ"]
  ],
  traps: { th: ["คืนนี้"], rom: ["keun née"] }
},
{
  th: ["พรุ่งนี้", "คุณ", "จะ", "ไป", "ทำ", "งาน", "ไหม"],
  rom: ["prûng-née", "kun", "jà", "bpai", "tam", "ngaan", "măi"],
  en: "Will you go to work tomorrow?",
  less: 7,
  answers: [
    ["พรุ่งนี้", "คุณ", "จะ", "ไป", "ทำ", "งาน", "ไหม"],
    ["คุณ", "จะ", "ไป", "ทำ", "งาน", "พรุ่งนี้", "ไหม"]
  ],
  traps: { th: ["คืนนี้"], rom: ["keun née"] }
},
{
  th: ["พรุ่งนี้", "ไป", "ดู", "หนัง", "กัน", "ไหม"],
  rom: ["prûng-née", "bpai", "doo", "năng", "gan", "măi"],
  en: "Shall we go watch a movie tomorrow?",
  less: 7,
  answers: [
    ["พรุ่งนี้", "ไป", "ดู", "หนัง", "กัน", "ไหม"],
    ["ไป", "ดู", "หนัง", "พรุ่งนี้", "กัน", "ไหม"],
    ["ไป", "ดู", "หนัง", "กัน", "พรุ่งนี้", "ไหม"]
  ]
},
{
  th: ["คืนนี้", "เรา", "ไป", "ออกกำลังกาย", "กัน", "ไหม"],
  rom: ["keun née", "rao", "bpai", "òk gam-lang gaai", "gan", "măi"],
  en: "Shall we go exercise tonight?",
  less: 7,
  answers: [
    ["คืนนี้", "เรา", "ไป", "ออกกำลังกาย", "กัน", "ไหม"],
    ["เรา", "ไป", "ออกกำลังกาย", "คืนนี้", "กัน", "ไหม"],
    ["เรา", "ไป", "ออกกำลังกาย", "กัน", "คืนนี้", "ไหม"]
  ],
  traps: { th: ["ไม่", "พรุ่งนี้"], rom: ["mâi", "prûng-née"] }
},
{
  th: ["คืนนี้", "ไป", "กิน", "ข้าว", "กัน", "ไหม"],
  rom: ["keun née", "bpai", "gin", "kâao", "gan", "măi"],
  en: "Shall we go eat tonight?",
  less: 7,
  answers: [
    ["คืนนี้", "ไป", "กิน", "ข้าว", "กัน", "ไหม"],
    ["ไป", "กิน", "ข้าว", "คืนนี้", "กัน", "ไหม"],
    ["ไป", "กิน", "ข้าว", "กัน", "คืนนี้", "ไหม"]
  ],
  traps: { th: ["ไม่", "เขา"], rom: ["mâi", "kăo"] }
},
{
  th: ["คืนนี้", "ผม", "จะ", "เรียน", "ภาษา", "ไทย", "แล้ว", "ก็", "เล่น", "เกม"],
  rom: ["keun née", "pŏm", "jà", "rian", "paa-săa", "thai", "láew", "gôr", "lên", "gem"],
  en: "Tonight I will study Thai and then play games.",
  less: 7,
  answers: [
    ["คืนนี้", "ผม", "จะ", "เรียน", "ภาษา", "ไทย", "แล้ว", "ก็", "เล่น", "เกม"],
    ["ผม", "จะ", "เรียน", "ภาษา", "ไทย", "แล้ว", "ก็", "เล่น", "เกม", "คืนนี้"]
  ]
},
{
  th: ["ฉัน", "จะ", "ไป", "กิน", "ข้าว", "แล้ว", "ก็", "เรียน", "ภาษา", "อังกฤษ"],
  rom: ["chăn", "jà", "bpai", "gin", "kâao", "láew", "gôr", "rian", "paa-săa", "ang-grìt"],
  en: "I will go eat and then study English.",
  less: 7,
  traps: { th: ["และ"], rom: ["láe"] }
},
{
  th: ["ผม", "เห็น", "เขา", "แต่", "เขา", "ไม่", "เห็น", "ผม"],
  rom: ["pŏm", "hĕn", "kăo", "dtàe", "kăo", "mâi", "hĕn", "pŏm"],
  en: "I see him, but he doesn't see me.",
  less: 7,
  traps: { th: ["ดู", "ได้ยิน"], rom: ["doo", "dâai yin"] }
},
{
  th: ["พรุ่งนี้", "ผม", "จะ", "ไม่", "ไป", "ทำ", "งาน", "แต่", "จะ", "ออกกำลังกาย"],
  rom: ["prûng-née", "pŏm", "jà", "mâi", "bpai", "tam", "ngaan", "dtàe", "jà", "òk gam-lang gaai"],
  en: "Tomorrow I won't go to work, but I will exercise.",
  less: 7,
  answers: [
    ["พรุ่งนี้", "ผม", "จะ", "ไม่", "ไป", "ทำ", "งาน", "แต่", "จะ", "ออกกำลังกาย"],
    ["ผม", "จะ", "ไม่", "ไป", "ทำ", "งาน", "พรุ่งนี้", "แต่", "จะ", "ออกกำลังกาย"]
  ],
  traps: { th: ["มา", "และ"], rom: ["maa", "láe"] }
},

// ===== LESSON 8 (To Be: keu / bpen / yòo) =====
{
  th: ["นี่", "คือ", "อะไร", "คะ"],
  rom: ["nêe", "keu", "à-rai", "ká"],
  en: "What is this? (female speaker)",
  less: 8,
  traps: { th: ["เป็น", "อยู่"], rom: ["bpen", "yòo"] }
},
{
  th: ["นั่น", "คือ", "อะไร", "ครับ"],
  rom: ["nân", "keu", "à-rai", "kráp"],
  en: "What is that? (male speaker)",
  less: 8,
  traps: { th: ["เป็น", "อยู่"], rom: ["bpen", "yòo"] }
},
{
  th: ["มัน", "คือ", "อะไร"],
  rom: ["man", "keu", "à-rai"],
  en: "What is it?",
  less: 8,
  traps: { th: ["เป็น", "อยู่"], rom: ["bpen", "yòo"] }
},
{
  th: ["นี่", "คือ", "ไก่", "หรือ", "หมู"],
  rom: ["nêe", "keu", "gài", "rĕu", "mŏo"],
  en: "Is this chicken or pork?",
  less: 8,
  answers: [
    ["นี่", "คือ", "ไก่", "หรือ", "หมู"],
    ["นี่", "คือ", "หมู", "หรือ", "ไก่"]
  ],
  traps: { th: ["เป็น", "อยู่", "เนื้อ"], rom: ["bpen", "yòo", "néua"] }
},
{
  th: ["นั่น", "คือ", "หมา", "หรือ", "แมว"],
  rom: ["nân", "keu", "măa", "rĕu", "maew"],
  en: "Is that a dog or a cat?",
  less: 8,
  answers: [
    ["นั่น", "คือ", "หมา", "หรือ", "แมว"],
    ["นั่น", "คือ", "แมว", "หรือ", "หมา"]
  ],
  traps: { th: ["เป็น", "อยู่", "และ"], rom: ["bpen", "yòo", "láe"] }
},
{
  th: ["คุณ", "กิน", "ไก่", "หรือ", "ปลา"],
  rom: ["kun", "gin", "gài", "rĕu", "bplaa"],
  en: "Do you eat chicken or fish?",
  less: 8,
  answers: [
    ["คุณ", "กิน", "ไก่", "หรือ", "ปลา"],
    ["คุณ", "กิน", "ปลา", "หรือ", "ไก่"]
  ],
  traps: { th: ["ผัก", "หมู"], rom: ["pàk", "mŏo"] }
},
{
  th: ["นี่", "ไม่", "ใช่", "รถยนต์"],
  rom: ["nêe", "mâi", "châi", "rót yon"],
  en: "This is not a car.",
  less: 8,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["นี่", "ไม่", "ใช่", "ผลไม้", "นี่", "คือ", "ผัก"],
  rom: ["nêe", "mâi", "châi", "pŏn-lá-mái", "nêe", "keu", "pàk"],
  en: "This is not a fruit, this is a vegetable.",
  less: 8,
  traps: { th: ["เป็น", "ไก่"], rom: ["bpen", "gài"] }
},
{
  th: ["มัน", "ไม่", "ใช่", "หมู", "มัน", "คือ", "เนื้อ"],
  rom: ["man", "mâi", "châi", "mŏo", "man", "keu", "néua"],
  en: "It is not pork, it is beef.",
  less: 8,
  traps: { th: ["เป็น", "ปลา"], rom: ["bpen", "bplaa"] }
},
{
  th: ["นั่น", "ไม่", "ใช่", "แท็กซี่"],
  rom: ["nân", "mâi", "châi", "táek-sêe"],
  en: "That is not a taxi.",
  less: 8,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["นั่น", "ไม่", "ใช่", "รถยนต์", "นั่น", "คือ", "รถตุ๊กๆ"],
  rom: ["nân", "mâi", "châi", "rót yon", "nân", "keu", "rót túk túk"],
  en: "That is not a car, that is a tuk tuk.",
  less: 8,
  traps: { th: ["เป็น"], rom: ["bpen"] }
},
{
  th: ["มัน", "ไม่", "ใช่", "น้ำ", "มัน", "คือ", "เบียร์"],
  rom: ["man", "mâi", "châi", "náam", "man", "keu", "bia"],
  en: "It is not water, it is beer.",
  less: 8,
  traps: { th: ["เป็น", "นม"], rom: ["bpen", "nom"] }
},
{
  th: ["นั่น", "คือ", "แมว", "ใช่", "ไหม"],
  rom: ["nân", "keu", "maew", "châi", "măi"],
  en: "That is a cat, right?",
  less: 8,
  traps: { th: ["เป็น", "อยู่"], rom: ["bpen", "yòo"] }
},
{
  th: ["นี่", "คือ", "เนื้อ", "ใช่", "ไหม"],
  rom: ["nêe", "keu", "néua", "châi", "măi"],
  en: "This is beef, right?",
  less: 8,
  traps: { th: ["เป็น", "อยู่"], rom: ["bpen", "yòo"] }
},
{
  th: ["ผม", "เป็น", "ครู", "ครับ"],
  rom: ["pŏm", "bpen", "kroo", "kráp"],
  en: "I am a teacher.",
  less: 8,
  traps: { th: ["คือ", "อยู่", "ค่ะ"], rom: ["keu", "yòo", "kâ"] }
},
{
  th: ["เขา", "อายุ", "สาม", "สิบ", "ปี", "และ", "เป็น", "คน", "ญี่ปุ่น"],
  rom: ["kăo", "aa-yú", "săam", "sìp", "bpee", "láe", "bpen", "kon", "yêe-bpùn"],
  en: "He/she is 30 years old and Japanese.",
  less: 8,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["ฉัน", "เป็น", "พนักงาน", "ออฟฟิศ"],
  rom: ["chăn", "bpen", "pá-nák ngaan", "óf-fít"],
  en: "I am an office worker.",
  less: 8,
  traps: { th: ["คือ", "อยู่"], rom: ["keu", "yòo"] }
},
{
  th: ["ผม", "ชื่อ", "ปีเตอร์", "ผม", "เป็น", "นักธุรกิจ"],
  rom: ["pŏm", "chûu", "Peter", "pŏm", "bpen", "nák tú-rá gìt"],
  en: "My name is Peter. I am a businessman.",
  less: 8,
  traps: { th: ["คือ", "อยู่"], rom: ["keu", "yòo"] }
},
{
  th: ["เขา", "เป็น", "หมอ", "อายุ", "สี่", "สิบ", "ปี"],
  rom: ["kăo", "bpen", "mŏr", "aa-yú", "sèe", "sìp", "bpee"],
  en: "He/she is a 40-year-old doctor.",
  less: 8,
  traps: { th: ["คือ", "อยู่"], rom: ["keu", "yòo"] }
},
{
  th: ["เขา", "ไม่", "ใช่", "หมอ", "เขา", "เป็น", "ตำรวจ"],
  rom: ["kăo", "mâi", "châi", "mŏr", "kăo", "bpen", "dtam-rùat"],
  en: "He/she is not a doctor, he/she is a police officer.",
  less: 8,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["เขา", "เป็น", "ตำรวจ", "ที่", "ฝรั่งเศส"],
  rom: ["kăo", "bpen", "dtam-rùat", "têe", "fà-ràng-sèt"],
  en: "He is a police officer in France.",
  less: 8,
  traps: { th: ["คือ", "หมอ"], rom: ["keu", "mŏr"] }
},
{
  th: ["ฉัน", "เป็น", "พยาบาล", "ค่ะ"],
  rom: ["chăn", "bpen", "pá-yaa-baan", "kâ"],
  en: "I am a nurse.",
  less: 8,
  traps: { th: ["คือ", "อยู่", "ครับ"], rom: ["keu", "yòo", "kráp"] }
},
{
  th: ["ผม", "อายุ", "สิบ", "หก", "ปี", "และ", "เป็น", "นักเรียน"],
  rom: ["pŏm", "aa-yú", "sìp", "hòk", "bpee", "láe", "bpen", "nák rian"],
  en: "I am 16 years old and a student.",
  less: 8,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["เขา", "เป็น", "คน", "ขับ", "รถ"],
  rom: ["kăo", "bpen", "kon", "kàp", "rót"],
  en: "He/she is a driver.",
  less: 8,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["คุณ", "ทำ", "งาน", "อะไร"],
  rom: ["kun", "tam", "ngaan", "à-rai"],
  en: "What do you do for work?",
  less: 8
},
{
  th: ["ผม", "ไม่", "ใช่", "ครู", "ผม", "เป็น", "ผู้จัดการ"],
  rom: ["pŏm", "mâi", "châi", "kroo", "pŏm", "bpen", "pôo-jàt-gaan"],
  en: "I am not a teacher. I'm a manager.",
  less: 8,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["เขา", "ไม่", "ใช่", "หมอ", "เขา", "เป็น", "พยาบาล"],
  rom: ["kăo", "mâi", "châi", "mŏr", "kăo", "bpen", "pá-yaa-baan"],
  en: "He/she is not a doctor, he/she is a nurse.",
  less: 8,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["เรา", "เป็น", "คน", "อังกฤษ"],
  rom: ["rao", "bpen", "kon", "ang-grìt"],
  en: "We are British.",
  less: 8,
  traps: { th: ["คือ", "อยู่"], rom: ["keu", "yòo"] }
},
{
  th: ["ผม", "ชื่อ", "ปีเตอร์", "และ", "เป็น", "โปรแกรมเมอร์"],
  rom: ["pŏm", "chûu", "Peter", "láe", "bpen", "proh-graem-mer"],
  en: "My name is Peter and I am a programmer.",
  less: 8,
  traps: { th: ["คือ", "อยู่", "แล้ว"], rom: ["keu", "yòo", "láew"] }
},
{
  th: ["พวกเขา", "เป็น", "คน", "อเมริกัน"],
  rom: ["pûak kăo", "bpen", "kon", "à-may-rí-gan"],
  en: "They are American.",
  less: 8,
  traps: { th: ["คือ", "อยู่"], rom: ["keu", "yòo"] }
},
{
  th: ["เขา", "เป็น", "คน", "ญี่ปุ่น"],
  rom: ["kăo", "bpen", "kon", "yêe-bpùn"],
  en: "He/she is Japanese.",
  less: 8,
  traps: { th: ["คือ", "หมา"], rom: ["keu", "măa"] }
},
{
  th: ["เขา", "ไม่", "ใช่", "คน", "ไทย"],
  rom: ["kăo", "mâi", "châi", "kon", "Thai"],
  en: "He/she is not Thai.",
  less: 8,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["คุณ", "เป็น", "คน", "อังกฤษ", "ใช่", "ไหม"],
  rom: ["kun", "bpen", "kon", "ang-grìt", "châi", "măi"],
  en: "You are British, right?",
  less: 8,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["ผม", "เป็น", "คน", "อังกฤษ", "และ", "เป็น", "ครู"],
  rom: ["pŏm", "bpen", "kon", "ang-grìt", "láe", "bpen", "kroo"],
  en: "I am British and a teacher.",
  less: 8,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["เขา", "ชื่อ", "เจมส์", "เขา", "เป็น", "นักธุรกิจ"],
  rom: ["kăo", "chûu", "James", "kăo", "bpen", "nák tú-rá gìt"],
  en: "His name is James. He is a businessman.",
  less: 8,
  traps: { th: ["อายุ"], rom: ["aa-yú"] }
},
{
  th: ["เขา", "เป็น", "นักธุรกิจ", "อายุ", "สี่", "สิบ", "ห้า", "ปี"],
  rom: ["kăo", "bpen", "nák tú-rá gìt", "aa-yú", "sèe", "sìp", "hâa", "bpee"],
  en: "He/she is 45 years old and a businessman.",
  less: 8,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["ผม", "อยู่", "บ้าน", "ครับ"],
  rom: ["pŏm", "yòo", "bâan", "kráp"],
  en: "I am at home. (male speaker)",
  less: 8,
  traps: { th: ["คือ", "เป็น"], rom: ["keu", "bpen"] }
},
{
  th: ["ฉัน", "อยู่", "โรง", "เรียน", "ค่ะ"],
  rom: ["chăn", "yòo", "rohng", "rian", "kâ"],
  en: "I am at school. (female speaker)",
  less: 8,
  traps: { th: ["คือ", "เป็น"], rom: ["keu", "bpen"] }
},
{
  th: ["เขา", "ทำ", "งาน", "ที่", "ออฟฟิศ"],
  rom: ["kăo", "tam", "ngaan", "têe", "óf-fít"],
  en: "He/she works at the office.",
  less: 8,
  traps: { th: ["เป็น"], rom: ["bpen"] }
},
{
  th: ["ฉัน", "เป็น", "ผู้จัดการ", "ที่", "โรงแรม", "ค่ะ"],
  rom: ["chăn", "bpen", "pôo-jàt-gaan", "têe", "rohng raem", "kâ"],
  en: "I am a manager at a hotel.",
  less: 8,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["เรา", "อยู่", "ร้าน", "อาหาร"],
  rom: ["rao", "yòo", "ráan", "aa-hăan"],
  en: "We are at the restaurant.",
  less: 8,
  traps: { th: ["คือ", "เป็น"], rom: ["keu", "bpen"] }
},
{
  th: ["คุณ", "อยู่", "บ้าน", "ไหม"],
  rom: ["kun", "yòo", "bâan", "măi"],
  en: "Are you at home?",
  less: 8,
  traps: { th: ["คือ", "เป็น", "อะไร"], rom: ["keu", "bpen", "à-rai"] }
},
{
  th: ["ผม", "ไม่", "อยู่", "บ้าน"],
  rom: ["pŏm", "mâi", "yòo", "bâan"],
  en: "I am not at home.",
  less: 8,
  traps: { th: ["ใช่"], rom: ["châi"] }
},
{
  th: ["พวก", "เขา", "ไม่", "อยู่", "บ้าน"],
  rom: ["pûak", "kăo", "mâi", "yòo", "bâan"],
  en: "They are not at home.",
  less: 8,
  traps: { th: ["ใช่"], rom: ["châi"] }
},
{
  th: ["เขา", "ไม่", "อยู่", "โรงเรียน"],
  rom: ["kăo", "mâi", "yòo", "rohng rian"],
  en: "He/she is not at school.",
  less: 8,
  traps: { th: ["ใช่"], rom: ["châi"] }
},
{
  th: ["เขา", "เรียน", "อยู่", "ที่", "โรง", "เรียน"],
  rom: ["kăo", "rian", "yòo", "têe", "rohng", "rian"],
  en: "He/she is studying at the school.",
  less: 8,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["คุณ", "อยู่", "บ้าน", "หรือ", "ออฟฟิศ"],
  rom: ["kun", "yòo", "bâan", "rĕu", "óf-fít"],
  en: "Are you at home or at work (office)?",
  less: 8,
  answers: [
    ["คุณ", "อยู่", "บ้าน", "หรือ", "ออฟฟิศ"],
    ["คุณ", "อยู่", "ออฟฟิศ", "หรือ", "บ้าน"]
  ],
  traps: { th: ["คือ", "เป็น"], rom: ["keu", "bpen"] }
},
{
  th: ["ผม", "ชื่อ", "ปีเตอร์", "ผม", "เป็น", "คน", "อังกฤษ"],
  rom: ["pŏm", "chûu", "Peter", "pŏm", "bpen", "kon", "ang-grìt"],
  en: "My name is Peter, I am British.",
  less: 8,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["เขา", "เป็น", "พนักงานออฟฟิศ", "มา", "จาก", "ฝรั่งเศส"],
  rom: ["kăo", "bpen", "pá-nák ngaan óf-fít", "maa", "jàak", "fà-ràng-sèt"],
  en: "She is an office worker from France.",
  less: 8,
  traps: { th: ["หมา"], rom: ["măa"] }
},
{
  th: ["เขา", "เป็น", "หมอ", "ที่", "โรง", "พยาบาล"],
  rom: ["kăo", "bpen", "mŏr", "têe", "rohng", "pá-yaa-baan"],
  en: "He/she is a doctor at a hospital.",
  less: 8,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["เรา", "กิน", "พิซซ่า", "อยู่"],
  rom: ["rao", "gin", "pít-sâa", "yòo"],
  en: "We are eating a pizza. (right now)",
  less: 8,
  traps: { th: ["ไหม"], rom: ["măi"] }
},
{
  th: ["ฉัน", "ทำ", "งาน", "อยู่", "ที่", "ออฟฟิศ"],
  rom: ["chăn", "tam", "ngaan", "yòo", "têe", "óf-fít"],
  en: "I'm working at the office.",
  less: 8,
  traps: { th: ["เป็น"], rom: ["bpen"] }
},
{
  th: ["ผม", "เรียน", "ภาษา", "ไทย", "อยู่", "ที่", "บ้าน"],
  rom: ["pŏm", "rian", "paa-săa", "Thai", "yòo", "têe", "bâan"],
  en: "I'm studying Thai at home.",
  less: 8,
  traps: { th: ["รู้"], rom: ["róo"] }
},
{
  th: ["เขา", "เป็น", "โปรแกรมเมอร์", "มา", "จาก", "จีน"],
  rom: ["kăo", "bpen", "proh-graem-mêr", "maa", "jàak", "jeen"],
  en: "He is a programmer from China.",
  less: 8,
  traps: { th: ["คือ", "ม้า"], rom: ["keu", "máa"] }
},
{
  th: ["คุณ", "เหนื่อย", "หรือ", "เศร้า"],
  rom: ["kun", "nèuay", "rĕu", "sâo"],
  en: "Are you tired or sad?",
  less: 8,
  answers: [
    ["คุณ", "เหนื่อย", "หรือ", "เศร้า"],
    ["คุณ", "เศร้า", "หรือ", "เหนื่อย"]
  ],
  traps: { th: ["เนื้อ", "โกรธ"], rom: ["néua", "gròht"] }
},

{
  th: ["คุณ", "กลัว", "หรือ", "ตื่นเต้น"],
  rom: ["kun", "glua", "rĕu", "dtèun dtên"],
  en: "Are you scared or excited?",
  less: 8,
  answers: [
    ["คุณ", "กลัว", "หรือ", "ตื่นเต้น"],
    ["คุณ", "ตื่นเต้น", "หรือ", "กลัว"]
  ],
  traps: { th: ["ดีใจ", "น่ากลัว"], rom: ["dee jai", "nâa glua"] }
},
{
  th: ["ฉัน", "เป็น", "คน", "ขาย", "ที่", "ห้าง"],
  rom: ["chăn", "bpen", "kon", "kăai", "têe", "hâang"],
  en: "I'm a salesperson at a mall.",
  less: 8,
  traps: { th: ["คือ", "อังกฤษ"], rom: ["keu", "ang-grìt"] }
},
{
  th: ["ฉัน", "เป็น", "พนักงานเสิร์ฟ", "ที่", "ร้าน", "กาแฟ"],
  rom: ["chăn", "bpen", "pá-nák-ngaan sèrf", "têe", "ráan", "gaa-fae"],
  en: "I'm a waitress at a cafe.",
  less: 8,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["เมื่อคืน", "ผม", "ไม่", "ได้", "อยู่", "บ้าน"],
  rom: ["mêua keun", "pŏm", "mâi", "dâai", "yòo", "bâan"],
  en: "Last night I wasn't at home.",
  less: 8,
  answers: [
    ["เมื่อคืน", "ผม", "ไม่", "ได้", "อยู่", "บ้าน"],
    ["ผม", "ไม่", "ได้", "อยู่", "บ้าน", "เมื่อคืน"]
  ],
  traps: { th: ["ไหม"], rom: ["măi"] }
},
{
  th: ["พรุ่งนี้", "พวก", "เขา", "จะ", "อยู่", "บ้าน"],
  rom: ["prûng née", "pûak", "kăo", "jà", "yòo", "bâan"],
  en: "Tomorrow, they will be at home.",
  less: 8,
  answers: [
    ["พรุ่งนี้", "พวก", "เขา", "จะ", "อยู่", "บ้าน"],
    ["พวก", "เขา", "จะ", "อยู่", "บ้าน", "พรุ่งนี้"]
  ],
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["เรา", "พักผ่อน", "อยู่", "ที่", "บ้าน"],
  rom: ["rao", "pák pòn", "yòo", "têe", "bâan"],
  en: "We're resting at home.",
  less: 8,
  traps: { th: ["เป็น"], rom: ["bpen"] }
},
{
  th: ["คุณ", "ดู", "โกรธ", "เป็น", "อะไร"],
  rom: ["kun", "doo", "gròht", "bpen", "à-rai"],
  en: "You look angry. What's the matter?",
  less: 8,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["คุณ", "ดู", "เหนื่อย", "เป็น", "อะไร"],
  rom: ["kun", "doo", "nèuay", "bpen", "à-rai"],
  en: "You look tired. What's the matter?",
  less: 8,
  traps: { th: ["เนื้อ"], rom: ["néua"] }
},
{
  th: ["ขอโทษ", "ครับ", "ห้องน้ำ", "อยู่", "ไหน", "ครับ"],
  rom: ["kŏr tôht", "kráp", "hông náam", "yòo", "năi", "kráp"],
  en: "Excuse me. Where is the bathroom?",
  less: 8,
  traps: { th: ["ไหม", "คือ"], rom: ["măi", "keu"] }
},
{
  th: ["เมื่อวาน", "ไป", "ทำ", "งาน", "ใช่", "ไหม"],
  rom: ["mêua waan", "bpai", "tam", "ngaan", "châi", "măi"],
  en: "You went to work yesterday, right?",
  less: 8,
  answers: [
    ["เมื่อวาน", "ไป", "ทำ", "งาน", "ใช่", "ไหม"],
    ["ไป", "ทำ", "งาน", "เมื่อวาน", "ใช่", "ไหม"]
  ],
  traps: { th: ["เมื่อคืน"], rom: ["mêua keun"] }
},
{
  th: ["เมื่อวาน", "เรา", "ไม่", "ได้", "อยู่", "บ้าน"],
  rom: ["mêua waan", "rao", "mâi", "dâai", "yòo", "bâan"],
  en: "Yesterday we weren't at home.",
  less: 8,
  answers: [
    ["เมื่อวาน", "เรา", "ไม่", "ได้", "อยู่", "บ้าน"],
    ["เรา", "ไม่", "ได้", "อยู่", "บ้าน", "เมื่อวาน"]
  ],
  traps: { th: ["เป็น", "ห้อง"], rom: ["bpen", "hông"] }
},
{
  th: ["เมื่อวาน", "ผม", "ไม่", "ได้", "ไป", "ทำ", "งาน"],
  rom: ["mêua waan", "pŏm", "mâi", "dâai", "bpai", "tam", "ngaan"],
  en: "Yesterday I didn't go to work.",
  answers: [
    ["เมื่อวาน", "ผม", "ไม่", "ได้", "ไป", "ทำ", "งาน"],
    ["ผม", "ไม่", "ได้", "ไป", "ทำ", "งาน", "เมื่อวาน"]
  ],
  less: 8
},
{
  th: ["เมื่อวาน", "ฉัน", "ไม่", "ได้", "เรียน", "ภาษา", "ไทย"],
  rom: ["mêua waan", "chăn", "mâi", "dâai", "rian", "paa-săa", "thai"],
  en: "Yesterday I didn't study Thai.",
  less: 8,
  answers: [
    ["เมื่อวาน", "ฉัน", "ไม่", "ได้", "เรียน", "ภาษา", "ไทย"],
    ["ฉัน", "ไม่", "ได้", "เรียน", "ภาษา", "ไทย", "เมื่อวาน"]
  ],
  traps: { th: ["อาหาร"], rom: ["aa-hăan"] }
},
{
  th: ["เมื่อคืน", "ทำ", "อะไร", "ครับ"],
  rom: ["mêua keun", "tam", "à-rai", "kráp"],
  en: "What did you do last night?",
  less: 8,
  answers: [
    ["เมื่อคืน", "ทำ", "อะไร", "ครับ"],
    ["ทำ", "อะไร", "เมื่อคืน", "ครับ"]
  ],
  traps: { th: ["ไหม", "เมื่อวาน"], rom: ["măi", "mêua waan"] }
},
{
  th: ["เมื่อวาน", "ฉัน", "กิน", "อาหาร", "อิตาเลียน"],
  rom: ["mêua waan", "chăn", "gin", "aa-hăan", "ì-dtaa-lian"],
  en: "Yesterday I ate Italian food.",
  less: 8,
  answers: [
    ["เมื่อวาน", "ฉัน", "กิน", "อาหาร", "อิตาเลียน"],
    ["ฉัน", "กิน", "อาหาร", "อิตาเลียน", "เมื่อวาน"]
  ],
  traps: { th: ["เมื่อคืน"], rom: ["mêua keun"] }
},
{
  th: ["เมื่อคืน", "ผม", "ดู", "หนัง", "ไทย"],
  rom: ["mêua keun", "pŏm", "doo", "năng", "thai"],
  en: "Last night I watched a Thai movie.",
  less: 8,
  answers: [
    ["เมื่อคืน", "ผม", "ดู", "หนัง", "ไทย"],
    ["ผม", "ดู", "หนัง", "ไทย", "เมื่อคืน"]
  ],
  traps: { th: ["หนังสือ", "เมื่อวาน"], rom: ["năng-sĕu", "mêua waan"] }
},
{
  th: ["เมื่อคืน", "ฉัน", "เรียน", "ภาษา", "ไทย", "แล้ว", "ก็", "กิน", "พิซซ่า"],
  rom: ["mêua keun", "chăn", "rian", "paa-săa", "thai", "láew", "gôr", "gin", "pít-sâa"],
  en: "Last night I studied Thai and then ate pizza.",
  less: 8,
  answers: [
    ["เมื่อคืน", "ฉัน", "เรียน", "ภาษา", "ไทย", "แล้ว", "ก็", "กิน", "พิซซ่า"],
    ["ฉัน", "เรียน", "ภาษา", "ไทย", "แล้ว", "ก็", "กิน", "พิซซ่า", "เมื่อคืน"]
  ],
  traps: { th: ["และ"], rom: ["láe"] }
},
{
  th: ["เมื่อวาน", "ผม", "ทำ", "งาน", "แล้ว", "ก็", "เล่น", "เกม", "ที่", "บ้าน"],
  rom: ["mêua waan", "pŏm", "tam", "ngaan", "láew", "gôr", "lên", "gem", "têe", "bâan"],
  en: "Yesterday I worked and then played games at home.",
  less: 8,
  answers: [
    ["เมื่อวาน", "ผม", "ทำ", "งาน", "แล้ว", "ก็", "เล่น", "เกม", "ที่", "บ้าน"],
    ["ผม", "ทำ", "งาน", "แล้ว", "ก็", "เล่น", "เกม", "ที่", "บ้าน", "เมื่อวาน"]
  ],
},
{
  th: ["เมื่อวาน", "ฉัน", "ทำ", "งาน", "ที่", "บ้าน"],
  rom: ["mêua waan", "chăn", "tam", "ngaan", "têe", "bâan"],
  en: "Yesterday I worked at home.",
  less: 8,
  answers: [
    ["เมื่อวาน", "ฉัน", "ทำ", "งาน", "ที่", "บ้าน"],
    ["ฉัน", "ทำ", "งาน", "ที่", "บ้าน", "เมื่อวาน"]
  ],
  traps: { th: ["เมื่อคืน"], rom: ["mêua keun"] }
},

// ===== LESSON 9 (Adjectives) =====
{
  th: ["อาหาร", "ไทย", "เผ็ด", "มาก"],
  rom: ["aa-hăan", "Thai", "pèt", "mâak"],
  en: "Thai food is very spicy.",
  less: 9,
  traps: { th: ["เป็น"], rom: ["bpen"] }
},
{
  th: ["ผม", "ชอบ", "กิน", "อาหาร", "เผ็ด"],
  rom: ["pŏm", "chôp", "gin", "aa-hăan", "pèt"],
  en: "I like to eat spicy food.",
  less: 9,
  traps: { th: ["ผัก"], rom: ["pàk"] }
},
{
  th: ["ฉัน", "ไม่", "ชอบ", "กิน", "อาหาร", "เผ็ด"],
  rom: ["chăn", "mâi", "chôp", "gin", "aa-hăan", "pèt"],
  en: "I don't like to eat spicy food.",
  less: 9,
  traps: { th: ["ไหม"], rom: ["măi"] }
},
{
  th: ["เขา", "ใจดี", "และ", "ตลก", "มาก"],
  rom: ["kăo", "jai dee", "láe", "dtà-lòk", "mâak"],
  en: "He/she is kind and very funny.",
  less: 9,
  answers: [
    ["เขา", "ใจดี", "และ", "ตลก", "มาก"],
    ["เขา", "ตลก", "และ", "ใจดี", "มาก"]
  ],
  traps: { th: ["แล้ว", "คือ"], rom: ["láew", "keu"] }
},
{
  th: ["เขา", "บอก", "ว่า", "อาหารไทย", "เผ็ด", "มาก", "แต่", "ผม", "ชอบ", "อาหาร", "เผ็ด"],
  rom: ["kăo", "bòk", "wâa", "aa-hăan Thai", "pèt", "mâak", "dtàe", "pŏm", "chôp", "aa-hăan", "pèt"],
  en: "He said Thai food is very spicy, but I like spicy food.",
  less: 9,
  traps: { th: ["เป็น", "คือ"], rom: ["bpen", "keu"] }
},
{
  th:  ["คน", "ไทย", "ใจ", "ดี", "และ", "ตลก", "มาก"],
  rom: ["kon", "Thai", "jai", "dee", "láe", "dtà-lòk", "mâak"],
  en:  "Thai people are very kind and funny.",
  less: 9,
  answers: [
    ["คน", "ไทย", "ใจ", "ดี", "และ", "ตลก", "มาก"],
    ["คน", "ไทย", "ตลก", "และ", "ใจ", "ดี", "มาก"]
  ],
  traps: { th: ["เข้า"], rom: ["kâo"] }
},
{
  th: ["เขา", "เป็น", "นักธุรกิจ", "ฉลาด", "มาก", "เขา", "มาจาก", "สิงคโปร์"],
  rom: ["kăo", "bpen", "nák tú-rá gìt", "chà-làat", "mâak", "kăo", "maa jàak", "sĭng-ká-poh"],
  en: "He is a very smart businessman. He's from Singapore.",
  less: 9,
  traps: { th: ["คือ", "จาก"], rom: ["keu", "jàak"] }
},
{
  th: ["วันนี้", "อากาศ", "ที่", "กรุงเทพ", "ร้อน", "มาก", "แต่", "ที่", "ญี่ปุ่น", "หนาว"],
  rom: ["wan née", "aa-gàat", "têe", "grung têp", "rón", "mâak", "dtàe", "têe", "yêe-bpùn", "năao"],
  en: "Today the weather in Bangkok is very hot, but in Japan it's cold.",
  less: 9,
  traps: { th: ["เป็น", "รอ"], rom: ["bpen", "ror"] }
},
{
  th: ["นักเรียน", "เบื่อ", "มาก", "เพราะ", "ครู", "น่าเบื่อ"],
  rom: ["nák rian", "bèua", "mâak", "prór", "kroo", "nâa bèua"],
  en: "The students are very bored because the teacher is boring.",
  less: 9,
  traps: { th: ["เป็น", "คือ"], rom: ["bpen", "keu"] }
},
{
  th: ["นักศึกษา", "จีน", "พูด", "ภาษา", "ไทย", "เก่ง", "มาก"],
  rom: ["nák-sèuk-săa", "jeen", "pôot", "paa-săa", "Thai", "gèng", "mâak"],
  en: "The Chinese university student speaks Thai very well.",
  less: 9,
  traps: { th: ["เป็น", "คือ"], rom: ["bpen", "keu"] }
},
{
  th: ["เขา", "หล่อ", "แต่", "หยาบคาย", "มาก", "ฉัน", "ไม่", "ชอบ", "เขา"],
  rom: ["kăo", "lòr", "dtàe", "yàap kaai", "mâak", "chăn", "mâi", "chôp", "kăo"],
  en: "He's handsome, but very rude. I don't like him.",
  less: 9,
  traps: { th: ["เป็น", "คือ"], rom: ["bpen", "keu"] }
},
{
  th: ["ฉัน", "ดีใจ", "มาก", "เพราะ", "วันนี้", "อากาศ", "ดี"],
  rom: ["chăn", "dee jai", "mâak", "prór", "wan née", "aa-gàat", "dee"],
  en: "I'm very happy because the weather is nice today.",
  less: 9,
  answers: [
    ["ฉัน", "ดีใจ", "มาก", "เพราะ", "วันนี้", "อากาศ", "ดี"],
    ["ฉัน", "ดีใจ", "มาก", "เพราะ", "อากาศ", "วันนี้", "ดี"]
  ],
  traps: { th: ["ใจดี", "เป็น"], rom: ["jai dee", "bpen"] }
},
{
  th: ["เด็ก", "ที่", "โรงเรียน", "นี้", "น่ารัก", "และ", "ฉลาด", "มาก"],
  rom: ["dèk", "têe", "rohng rian", "née", "nâa rák", "láe", "chà-làat", "mâak"],
  en: "The kids at this school are cute and very smart.",
  less: 9,
  answers: [
    ["เด็ก", "ที่", "โรงเรียน", "นี้", "น่ารัก", "และ", "ฉลาด", "มาก"],
    ["เด็ก", "ที่", "โรงเรียน", "นี้", "ฉลาด", "และ", "น่ารัก", "มาก"]
  ],
  traps: { th: ["นี่", "รัก"], rom: ["nêe", "rák"] }
},
{
  th: ["วันนี้", "ผม", "เหนื่อย", "มาก", "เพราะ", "งาน", "ยาก", "มาก"],
  rom: ["wan née", "pŏm", "nèuay", "mâak", "prór", "ngaan", "yâak", "mâak"],
  en: "Today I'm very tired because work is very hard.",
  less: 9,
  answers: [
    ["วันนี้", "ผม", "เหนื่อย", "มาก", "เพราะ", "งาน", "ยาก", "มาก"],
    ["ผม", "เหนื่อย", "มาก", "วันนี้", "เพราะ", "งาน", "ยาก", "มาก"]
  ],
  traps: { th: ["ง่าย", "เป็น"], rom: ["ngâai", "bpen"] }
},
{
  th: ["เมื่อวาน", "คนขับรถ", "ใจดี", "และ", "ตลก", "มาก"],
  rom: ["mêua waan", "kon kàp rót", "jai dee", "láe", "dtà-lòk", "mâak"],
  en: "Yesterday the driver was kind and very funny.",
  less: 9,
  answers: [
    ["เมื่อวาน", "คนขับรถ", "ใจดี", "และ", "ตลก", "มาก"],
    ["เมื่อวาน", "คนขับรถ", "ตลก", "และ", "ใจดี", "มาก"]
  ],
  traps: { th: ["ดีใจ", "เป็น"], rom: ["dee jai", "bpen"] }
},
{
  th: ["เขา", "หล่อ", "และ", "ฉลาด", "มาก", "ค่ะ"],
  rom: ["kăo", "lòr", "láe", "chà-làat", "mâak", "kâ"],
  en: "He is very handsome and smart. (female speaker)",
  less: 9,
  answers: [
    ["เขา", "หล่อ", "และ", "ฉลาด", "มาก", "ค่ะ"],
    ["เขา", "ฉลาด", "และ", "หล่อ", "มาก", "ค่ะ"]
  ],
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["เมื่อวาน", "ผม", "เห็น", "นก", "สวย", "มาก", "ที่", "บ้าน"],
  rom: ["mêua waan", "pŏm", "hĕn", "nók", "sŭay", "mâak", "têe", "bâan"],
  en: "Yesterday I saw a very beautiful bird at home.",
  less: 9,
  answers: [
    ["เมื่อวาน", "ผม", "เห็น", "นก", "สวย", "มาก", "ที่", "บ้าน"],
    ["ผม", "เห็น", "นก", "สวย", "มาก", "ที่", "บ้าน", "เมื่อวาน"]
  ],
  traps: { th: ["ซวย", "เป็น"], rom: ["suay", "bpen"] }
},
{
  th: ["เมื่อคืน", "ผม", "ดู", "หนัง", "น่ากลัว", "ผม", "กลัว", "มาก"],
  rom: ["mêua keun", "pŏm", "doo", "năng", "nâa glua", "pŏm", "glua", "mâak"],
  en: "Last night I watched a scary movie. I was very scared.",
  less: 9,
  answers: [
    ["เมื่อคืน", "ผม", "ดู", "หนัง", "น่ากลัว", "ผม", "กลัว", "มาก"],
    ["ผม", "ดู", "หนัง", "น่ากลัว", "เมื่อคืน", "ผม", "กลัว", "มาก"]
  ],
  traps: { th: ["เป็น", "น่ากิน"], rom: ["bpen", "nâa gin"] }
},
{
  th: ["เมื่อวาน", "อากาศ", "ที่", "ลอนดอน", "ไม่", "ดี", "หนาว", "มาก"],
  rom: ["mêua waan", "aa-gàat", "têe", "lon-don", "mâi", "dee", "năao", "mâak"],
  en: "Yesterday the weather in London wasn't good. It was very cold.",
  less: 9,
  traps: { th: ["เป็น", "คือ"], rom: ["bpen", "keu"] }
},
{
  th: ["คุณ", "ตลก", "มาก", "ค่ะ"],
  rom: ["kun", "dtà-lòk", "mâak", "kâ"],
  en: "You are very funny. (female speaker)",
  less: 9,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["เขา", "ไม่", "ตลก", "เลย"],
  rom: ["kăo", "mâi", "dtà-lòk", "loie"],
  en: "He/she is not funny at all.",
  less: 9,
  traps: { th: ["ไม่ใช่"], rom: ["mâi châi"] }
},
{
  th: ["เขา", "เป็น", "คน", "ใจดี", "แต่", "ไม่", "ตลก", "เลย"],
  rom: ["kăo", "bpen", "kon", "jai dee", "dtàe", "mâi", "dtà-lòk", "loie"],
  en: "He/she is a kind person, but not funny at all.",
  less: 9,
  traps: { th: ["คือ", "ไม่ใช่"], rom: ["keu", "mâi châi"] }
},
{
  th: ["ภาษา", "ไทย", "ยาก", "แต่", "ผม", "ชอบ", "เพราะ", "สนุก", "มาก"],
  rom: ["paa-săa", "Thai", "yâak", "dtàe", "pŏm", "chôp", "prór", "sà-nùk", "mâak"],
  en: "Thai is difficult, but I like it because it's a lot of fun.",
  less: 9,
  traps: { th: ["เป็น", "น่าเบื่อ"], rom: ["bpen", "nâa bèua"] }
},
{
  th: ["พวก", "เขา", "ไม่", "ฉลาด"],
  rom: ["pûak", "kăo", "mâi", "chà-làat"],
  en: "They are not smart.",
  less: 9,
  traps: { th: ["ไม่ใช่"], rom: ["mâi châi"] }
},
{
  th: ["เขา", "ฉลาด", "และ", "ตลก"],
  rom: ["kăo", "chà-làat", "láe", "dtà-lòk"],
  en: "He/she is smart and funny.",
  less: 9,
  answers: [
    ["เขา", "ฉลาด", "และ", "ตลก"],
    ["เขา", "ตลก", "และ", "ฉลาด"]
  ],
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["คุณ", "สวย", "และ", "ใจดี"],
  rom: ["kun", "sŭay", "láe", "jai dee"],
  en: "You are beautiful and kind.",
  less: 9,
  answers: [
    ["คุณ", "สวย", "และ", "ใจดี"],
    ["คุณ", "ใจดี", "และ", "สวย"]
  ],
  traps: { th: ["คือ", "ซวย"], rom: ["keu", "suay"] }
},
{
  th: ["เขา", "สวย", "แต่", "หยาบคาย"],
  rom: ["kăo", "sŭay", "dtàe", "yàap kaai"],
  en: "She is beautiful, but rude.",
  less: 9,
  traps: { th: ["ซวย"], rom: ["suay"] }
},
{
  th: ["อาหาร", "อร่อย", "แต่", "แพง", "มาก"],
  rom: ["aa-hăan", "à-ròi", "dtàe", "paeng", "mâak"],
  en: "The food is delicious, but very expensive.",
  less: 9
},
{
  th: ["ร้าน", "อาหาร", "นี้", "แพง", "มาก"],
  rom: ["ráan", "aa-hăan", "née", "paeng", "mâak"],
  en: "This restaurant is very expensive.",
  less: 9
},
{
  th: ["อาหาร", "ที่", "ร้าน", "นี้", "อร่อย"],
  rom: ["aa-hăan", "têe", "ráan", "née", "à-ròi"],
  en: "The food at this restaurant is delicious.",
  less: 9
},
{
  th: ["ผม", "กิน", "พิซซ่า", "อร่อย", "มาก"],
  rom: ["pŏm", "gin", "pít-sâa", "à-ròi", "mâak"],
  en: "I am eating a very delicious pizza.",
  less: 9,
  traps: { th: ["อะไร"], rom: ["à-rai"] }
},
{
  th: ["อากาศ", "ที่", "กรุงเทพ", "ร้อน", "มาก"],
  rom: ["aa-gàat", "têe", "krung-têp", "rón", "mâak"],
  en: "The weather in Bangkok is very hot.",
  less: 9,
  traps: { th: ["รถ"], rom: ["rót"] }
},
{
  th: ["อากาศ", "ที่", "ญี่ปุ่น", "หนาว", "มาก"],
  rom: ["aa-gàat", "têe", "yêe-bpùn", "năao", "mâak"],
  en: "The weather in Japan is very cold.",
  less: 9,
  traps: { th: ["เย็น"], rom: ["yen"] }
},
{
  th: ["คุณ", "ชอบ", "อากาศ", "ร้อน", "หรือ", "อากาศ", "หนาว"],
  rom: ["kun", "chôp", "aa-gàat", "rón", "rĕu", "aa-gàat", "năao"],
  en: "Do you like hot weather or cold weather?",
  less: 9,
  answers: [
    ["คุณ", "ชอบ", "อากาศ", "ร้อน", "หรือ", "อากาศ", "หนาว"],
    ["คุณ", "ชอบ", "อากาศ", "หนาว", "หรือ", "อากาศ", "ร้อน"]
  ],
  traps: { th: ["เย็น"], rom: ["yen"] }
},
{
  th: ["ฉัน", "ชอบ", "ชา", "เย็น", "มาก"],
  rom: ["chăn", "chôp", "chaa", "yen", "mâak"],
  en: "I like iced tea very much.",
  less: 9,
  traps: { th: ["หนาว"], rom: ["năao"] }
},
{
  th: ["อาหาร", "ที่", "นี่", "ถูก", "และ", "อร่อย"],
  rom: ["aa-hăan", "têe", "nêe", "tòok", "láe", "à-ròi"],
  en: "The food here is cheap and delicious.",
  less: 9,
  answers: [
    ["อาหาร", "ที่", "นี่", "ถูก", "และ", "อร่อย"],
    ["อาหาร", "ที่", "นี่", "อร่อย", "และ", "ถูก"]
  ],
  traps: { th: ["แล้ว"], rom: ["láew"] }
},
{
  th: ["แมว", "น่า", "รัก", "มาก"],
  rom: ["maew", "nâa", "rák", "mâak"],
  en: "The cat is very cute.",
  less: 9,
  traps: { th: ["ชอบ"], rom: ["chôp"] }
},
{
  th: ["เขา", "เป็น", "ผู้หญิง", "สวย"],
  rom: ["kăo", "bpen", "pôo yĭng", "sŭay"],
  en: "She is a beautiful woman.",
  less: 9,
  traps: { th: ["คือ", "ซวย"], rom: ["keu", "suay"] }
},
{
  th: ["เขา", "เป็น", "ผู้ชาย", "ฉลาด"],
  rom: ["kăo", "bpen", "pôo chaai", "chà-làat"],
  en: "He is a smart man.",
  less: 9,
  traps: { th: ["ข้าว"], rom: ["kâao"] }
},
{
  th: ["เขา", "เป็น", "เด็ก", "น่า", "รัก"],
  rom: ["kăo", "bpen", "dèk", "nâa", "rák"],
  en: "He/she is a cute kid.",
  less: 9,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["ผม", "ชอบ", "ดู", "หนัง", "ตลก"],
  rom: ["pŏm", "chôp", "doo", "năng", "dtà-lòk"],
  en: "I like to watch funny movies.",
  less: 9,
  traps: { th: ["อ่าน"], rom: ["àan"] }
},
{
  th: ["เขา", "เป็น", "คน", "ตลก"],
  rom: ["kăo", "bpen", "kon", "dtà-lòk"],
  en: "He/she is a funny person.",
  less: 9,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["เขา", "ไม่", "ใช่", "คน", "ฉลาด"],
  rom: ["kăo", "mâi", "châi", "kon", "chà-làat"],
  en: "He/she is not a smart person.",
  less: 9,
  traps: { th: ["คือ", "เป็น"], rom: ["keu", "bpen"] }
},
{
  th: ["คุณ", "เป็น", "คน", "ใจดี", "มาก"],
  rom: ["kun", "bpen", "kon", "jai dee", "mâak"],
  en: "You are a very kind person.",
  less: 9,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["เขา", "เป็น", "คน", "ฉลาด", "ใช่", "ไหม"],
  rom: ["kăo", "bpen", "kon", "chà-làat", "châi", "măi"],
  en: "He/she is a smart person, right?",
  less: 9,
  traps: { th: ["คือ", "ไม่"], rom: ["keu", "mâi"] }
},
{
  th: ["ภาษา", "ไทย", "ยาก", "มาก"],
  rom: ["paa-săa", "Thai", "yâak", "mâak"],
  en: "Thai language is very difficult.",
  less: 9,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["บทเรียน", "นี้", "ไม่", "ยาก"],
  rom: ["bòt-rian", "née", "mâi", "yâak"],
  en: "This lesson is not difficult.",
  less: 9,
  traps: { th: ["ไม่ใช่"], rom: ["mâi châi"] }
},
{
  th: ["ภาษา", "ไทย", "ง่าย", "หรือ", "ยาก"],
  rom: ["paa-săa", "Thai", "ngâai", "rĕu", "yâak"],
  en: "Is Thai language easy or difficult?",
  less: 9,
  answers: [
    ["ภาษา", "ไทย", "ง่าย", "หรือ", "ยาก"],
    ["ภาษา", "ไทย", "ยาก", "หรือ", "ง่าย"]
  ],
  traps: { th: ["แต่"], rom: ["dtàe"] }
},
{
  th: ["ทำไม", "คุณ", "เรียน", "ภาษา", "จีน"],
  rom: ["tam-mai", "kun", "rian", "paa-săa", "jeen"],
  en: "Why do you study Chinese?",
  less: 9,
  answers: [
    ["ทำไม", "คุณ", "เรียน", "ภาษา", "จีน"],
    ["คุณ", "เรียน", "ภาษา", "จีน", "ทำไม"]
  ],
  traps: { th: ["ดู"], rom: ["doo"] }
},
{
  th: ["ทำไม", "คุณ", "ไม่", "กิน"],
  rom: ["tam-mai", "kun", "mâi", "gin"],
  en: "Why don't you eat?",
  less: 9,
  answers: [
    ["ทำไม", "คุณ", "ไม่", "กิน"],
    ["คุณ", "ไม่", "กิน", "ทำไม"]
  ],
  traps: { th: ["ไม่ใช่"], rom: ["mâi châi"] }
},
{
  th: ["ผม", "ชอบ", "เขา", "เพราะ", "เขา", "ตลก", "มาก"],
  rom: ["pŏm", "chôp", "kăo", "prór", "kăo", "dtà-lòk", "mâak"],
  en: "I like him/her because he/she is very funny.",
  less: 9
},
{
  th: ["ผม", "เรียน", "ภาษา", "ไทย", "เพราะ", "ผม", "ชอบ", "ประเทศ", "ไทย"],
  rom: ["pŏm", "rian", "paa-săa", "Thai", "prór", "pŏm", "chôp", "bprà-têt", "Thai"],
  en: "I study Thai because I like Thailand.",
  less: 9,
  traps: { th: ["แต่"], rom: ["dtàe"] }
},
{
  th: ["ผม", "ชอบ", "คุณ", "เพราะ", "คุณ", "ฉลาด", "ตลก", "และ", "สวย"],
  rom: ["pŏm", "chôp", "kun", "prór", "kun", "chà-làat", "dtà-lòk", "láe", "sŭay"],
  en: "I like you because you are smart, funny and beautiful.",
  less: 9,
  answers: [
    ["ผม", "ชอบ", "คุณ", "เพราะ", "คุณ", "ฉลาด", "ตลก", "และ", "สวย"],
    ["ผม", "ชอบ", "คุณ", "เพราะ", "คุณ", "ฉลาด", "สวย", "และ", "ตลก"],
    ["ผม", "ชอบ", "คุณ", "เพราะ", "คุณ", "ตลก", "ฉลาด", "และ", "สวย"],
    ["ผม", "ชอบ", "คุณ", "เพราะ", "คุณ", "ตลก", "สวย", "และ", "ฉลาด"],
    ["ผม", "ชอบ", "คุณ", "เพราะ", "คุณ", "สวย", "ฉลาด", "และ", "ตลก"],
    ["ผม", "ชอบ", "คุณ", "เพราะ", "คุณ", "สวย", "ตลก", "และ", "ฉลาด"]
  ]
},
{
  th: ["เธอ", "สวย", "และ", "ใจดี", "มาก"],
  rom: ["ter", "sŭay", "láe", "jai dee", "mâak"],
  en: "You are beautiful and very kind. (informal)",
  less: 9,
  answers: [
    ["เธอ", "สวย", "และ", "ใจดี", "มาก"],
    ["เธอ", "ใจดี", "และ", "สวย", "มาก"]
  ],
  traps: { th: ["ซวย"], rom: ["suay"] }
},
{
  th: ["เธอ", "ดู", "เด็ก", "มาก"],
  rom: ["ter", "doo", "dèk", "mâak"],
  en: "You look very young. (informal)",
  less: 9,
  traps: { th: ["เห็น"], rom: ["hĕn"] }
},
{
  th: ["หนัง", "น่าเบื่อ", "มาก", "เลย"],
  rom: ["năng", "nâa bèua", "mâak", "loie"],
  en: "The movie is very boring.",
  less: 9,
  traps: { th: ["เบื่อ"], rom: ["bèua"] }
},
{
  th: ["ฉัน", "กลัว", "เพราะ", "หนัง", "น่ากลัว", "มาก"],
  rom: ["chăn", "glua", "prór", "năng", "nâa glua", "mâak"],
  en: "I'm scared because the movie is very scary.",
  less: 9
},
{
  th: ["ทำไม", "คุณ", "เศร้า"],
  rom: ["tam-mai", "kun", "sâo"],
  en: "Why are you sad?",
  less: 9,
  answers: [
    ["ทำไม", "คุณ", "เศร้า"],
    ["คุณ", "เศร้า", "ทำไม"]
  ],
  traps: { th: ["อะไร", "เบื่อ"], rom: ["à-rai", "bèua"] }
},
{
  th: ["ทำไม", "คุณ", "โกรธ", "หรอ"],
  rom: ["tam-mai", "kun", "gròht", "rŏr"],
  en: "Why are you angry? (surprised)",
  less: 9,
  traps: { th: ["เศร้า"], rom: ["sâo"] }
},
{
  th: ["ทำไม", "คุณ", "ตื่นเต้น", "มาก"],
  rom: ["tam-mai", "kun", "dtèun dtên", "mâak"],
  en: "Why are you so excited?",
  less: 9,
  traps: { th: ["เป็น", "โกรธ"], rom: ["bpen", "gròht"] }
},
{
  th: ["ฉัน", "อยู่", "บ้าน", "เพราะ", "ไม่", "สบาย"],
  rom: ["chăn", "yòo", "bâan", "prór", "mâi", "sà-baai"],
  en: "I'm at home, because I don't feel well.",
  less: 9
},

// ===== LESSON 10 (Market, Taxi) =====
{
  th: ["ขอโทษ", "ครับ", "นี่", "เท่าไหร่", "ครับ"],
  rom: ["kŏr tôht", "kráp", "nêe", "tâo rài", "kráp"],
  en: "Excuse me, how much is this?",
  less: 10,
  traps: { th: ["นี้", "อะไร"], rom: ["née", "à-rai"] }
},
{
  th: ["สวัสดี", "ค่ะ", "อัน", "นั้น", "เท่าไหร่", "คะ"],
  rom: ["sà-wàt-dee", "kâ", "an", "nán", "tâo rài", "ká"],
  en: "Hello. How much is that one?",
  less: 10,
  traps: { th: ["นั่น", "อะไร"], rom: ["nân", "à-rai"] }
},
{
  th: ["สวัสดี", "ครับ", "เสื้อ", "นี้", "เท่าไหร่", "ครับ"],
  rom: ["sà-wàt-dee", "kráp", "sêua", "née", "tâo rài", "kráp"],
  en: "Hello. How much is this shirt?",
  less: 10,
  traps: { th: ["นี่", "อะไร"], rom: ["nêe", "à-rai"] }
},
{
  th: ["อัน", "นี้", "แพง", "เกิน", "ไป"],
  rom: ["an", "née", "paeng", "gern", "bpai"],
  en: "This one is too expensive.",
  less: 10,
  traps: { th: ["นี่"], rom: ["nêe"] }
},
{
  th: ["แพง", "เกินไป", "ลด", "ได้", "ไหม", "ครับ"],
  rom: ["paeng", "gern bpai", "lót", "dâai", "măi", "kráp"],
  en: "Too expensive. Can you lower the price?",
  less: 10,
  traps: { th: ["หล่อ"], rom: ["lòr"] }
},
{
  th: ["ลด", "ได้", "ไหม", "คะ"],
  rom: ["lót", "dâai", "măi", "ká"],
  en: "Can you lower the price?",
  less: 10,
  traps: { th: ["หล่อ", "ไม่"], rom: ["lòr", "mâi"] }
},
{
  th: ["สาม", "ร้อย", "แพง", "เกินไป", "สอง", "ร้อย", "ได้", "ไหม", "ครับ"],
  rom: ["săam", "rói", "paeng", "gern bpai", "sŏng", "rói", "dâai", "măi", "kráp"],
  en: "300 is too expensive. Can you do 200?",
  less: 10,
  traps: { th: ["เท่าไหร่", "มาก"], rom: ["tâo rài", "mâak"] }
},
{
  th: ["หนึ่ง", "ร้อย", "ห้าสิบ", "บาท", "ได้", "ไหม", "ครับ"],
  rom: ["nèung", "rói", "hâa-sìp", "bàat", "dâai", "măi", "kráp"],
  en: "Can you do 150 baht? (bargaining)",
  less: 10
},
{
  th: ["แปด", "สิบ", "บาท", "ได้", "ไหม", "คะ"],
  rom: ["bpàet", "sìp", "bàat", "dâai", "măi", "ká"],
  en: "Can you do 80 baht? (bargaining)",
  less: 10,
  traps: { th: ["ค่ะ"], rom: ["kâ"] }
},
{
  th: ["อาหาร", "ที่", "ร้าน", "นี้", "อร่อย", "แต่", "แพง", "เกินไป"],
  rom: ["aa-hăan", "têe", "ráan", "née", "à-ròi", "dtàe", "paeng", "gern bpai"],
  en: "The food at this restaurant is delicious, but too expensive.",
  less: 10,
  traps: { th: ["นี่", "และ"], rom: ["nêe", "láe"] }
},
{
  th: ["เสื้อ", "นี้", "ถูก", "และ", "สวย"],
  rom: ["sêua", "née", "tòok", "láe", "sŭay"],
  en: "This shirt is cheap and beautiful.",
  less: 10,
  answers: [
    ["เสื้อ", "นี้", "ถูก", "และ", "สวย"],
    ["เสื้อ", "นี้", "สวย", "และ", "ถูก"]
  ],
  traps: { th: ["นี่"], rom: ["nêe"] }
},
{
  th: ["ขอโทษ", "ครับ", "ผม", "ลอง", "อัน", "นี้", "ได้", "ไหม", "ครับ"],
  rom: ["kŏr tôht", "kráp", "pŏm", "long", "an", "née", "dâai", "măi", "kráp"],
  en: "Excuse me, can I try this one on?",
  less: 10,
  traps: { th: ["นี่", "ไม่"], rom: ["nêe", "mâi"] }
},
{
  th: ["ผม", "กิน", "เผ็ด", "ไม่", "ได้"],
  rom: ["pŏm", "gin", "pèt", "mâi", "dâai"],
  en: "I can't eat spicy food.",
  less: 10,
  traps: { th: ["ใช่"], rom: ["châi"] }
},
{
  th: ["ฉัน", "กิน", "เผ็ด", "ได้", "แต่", "เขา", "กิน", "เผ็ด", "ไม่", "ได้"],
  rom: ["chăn", "gin", "pèt", "dâai", "dtàe", "kăo", "gin", "pèt", "mâi", "dâai"],
  en: "I can eat spicy food, but he/she can't.",
  less: 10,
  traps: { th: ["และ"], rom: ["láe"] }
},
{
  th: ["คุณ", "กิน", "อาหาร", "เผ็ด", "ได้", "ไหม"],
  rom: ["kun", "gin", "aa-hăan", "pèt", "dâai", "măi"],
  en: "Can you eat spicy food?",
  less: 10,
  traps: { th: ["ไม่"], rom: ["mâi"] }
},
{
  th: ["ผม", "พูด", "ภาษา", "ไทย", "ได้", "นิดหน่อย"],
  rom: ["pŏm", "pôot", "paa-săa", "Thai", "dâai", "nít nòi"],
  en: "I can speak Thai a little bit.",
  less: 10,
  traps: { th: ["อาหาร"], rom: ["aa-hăan"] }
},
{
  th: ["ฉัน", "พูด", "ภาษา", "อังกฤษ", "ได้", "ค่ะ"],
  rom: ["chăn", "pôot", "paa-săa", "ang-grìt", "dâai", "kâ"],
  en: "I can speak English.",
  less: 10
},
{
  th: ["พวก", "เขา", "พูด", "ภาษา", "ไทย", "ไม่", "ได้"],
  rom: ["pûak", "kăo", "pôot", "paa-săa", "Thai", "mâi", "dâai"],
  en: "They can't speak Thai.",
  less: 10
},
{
  th: ["คุณ", "พูด", "ภาษา", "อังกฤษ", "ได้", "ไหม"],
  rom: ["kun", "pôot", "paa-săa", "ang-grìt", "dâai", "măi"],
  en: "Can you speak English?",
  less: 10
},
{
  th: ["ฉัน", "ทำ", "อาหาร", "ได้", "อร่อย", "มาก"],
  rom: ["chăn", "tam", "aa-hăan", "dâai", "à-ròi", "mâak"],
  en: "I can cook very well.",
  less: 10
},
{
  th: ["พรุ่งนี้", "จะ", "ซื้อ", "อะไร", "ที่", "ตลาด"],
  rom: ["prûng née", "jà", "séu", "à-rai", "têe", "dtà-làat"],
  en: "What will you buy at the market tomorrow?",
  less: 10,
  answers: [
    ["พรุ่งนี้", "จะ", "ซื้อ", "อะไร", "ที่", "ตลาด"],
    ["จะ", "ซื้อ", "อะไร", "ที่", "ตลาด", "พรุ่งนี้"]
  ],
  traps: { th: ["อยู่"], rom: ["yòo"] }
},
{
  th: ["พรุ่งนี้", "คุณ", "ไป", "ตลาด", "ได้", "ไหม", "ครับ"],
  rom: ["prûng-née", "kun", "bpai", "dtà-làat", "dâai", "măi", "kráp"],
  en: "Can you go to the market tomorrow?",
  less: 10,
  answers: [
    ["พรุ่งนี้", "คุณ", "ไป", "ตลาด", "ได้", "ไหม", "ครับ"],
    ["คุณ", "ไป", "ตลาด", "พรุ่งนี้", "ได้", "ไหม", "ครับ"]
  ],
  traps: { th: ["ไม่", "เมื่อวาน"], rom: ["mâi", "mêua waan"] }
},
{
  th: ["ขอโทษ", "ค่ะ", "พรุ่งนี้", "ฉัน", "ไป", "ไม่", "ได้"],
  rom: ["kŏr tôht", "kâ", "prûng-née", "chăn", "bpai", "mâi", "dâai"],
  en: "Sorry, I can't go tomorrow.",
  less: 10,
  answers: [
    ["ขอโทษ", "ค่ะ", "พรุ่งนี้", "ฉัน", "ไป", "ไม่", "ได้"],
    ["ขอโทษ", "ค่ะ", "ฉัน", "ไป", "พรุ่งนี้", "ไม่", "ได้"]
  ],
  traps: { th: ["คะ", "เมื่อวาน"], rom: ["ká", "mêua waan"] }
},
{
  th: ["พรุ่งนี้", "เขา", "ไป", "ตลาด", "ไม่", "ได้"],
  rom: ["prûng-née", "kăo", "bpai", "dtà-làat", "mâi", "dâai"],
  en: "He/she can't go to the market tomorrow.",
  less: 10,
  answers: [
    ["พรุ่งนี้", "เขา", "ไป", "ตลาด", "ไม่", "ได้"],
    ["เขา", "ไป", "ตลาด", "พรุ่งนี้", "ไม่", "ได้"]
  ],
  traps: { th: ["เมื่อวาน", "ไหม"], rom: ["mêua waan", "măi"] }
},
{
  th: ["เมื่อวาน", "ผม", "ไม่", "ได้", "ไป", "ตลาด"],
  rom: ["mêua waan", "pŏm", "mâi", "dâai", "bpai", "dtà-làat"],
  en: "Yesterday I didn't go to the market.",
  less: 10,
  answers: [
    ["เมื่อวาน", "ผม", "ไม่", "ได้", "ไป", "ตลาด"],
    ["ผม", "ไม่", "ได้", "ไป", "ตลาด", "เมื่อวาน"]
  ],
  traps: { th: ["พรุ่งนี้", "ใช่"], rom: ["prûng-née", "châi"] }
},
{
  th: ["เมื่อวาน", "ผม", "ไม่ได้", "เจอ", "เขา", "เพราะ", "เขา", "มา", "ไม่ได้"],
  rom: ["mêua waan", "pŏm", "mâi dâai", "jer", "kăo", "prór", "kăo", "maa", "mâi dâai"],
  en: "Yesterday I didn't meet him because he couldn't come.",
  less: 10,
  answers: [
    ["เมื่อวาน", "ผม", "ไม่ได้", "เจอ", "เขา", "เพราะ", "เขา", "มา", "ไม่ได้"],
    ["ผม", "ไม่ได้", "เจอ", "เขา", "เมื่อวาน", "เพราะ", "เขา", "มา", "ไม่ได้"]
  ],
  traps: { th: ["ใช่"], rom: ["châi"] }
},
{
  th: ["สวัสดี", "ครับ", "ไป", "สนามบิน", "เท่าไหร่", "ครับ"],
  rom: ["sà-wàt-dee", "kráp", "bpai", "sà-năam bin", "tâo rài", "kráp"],
  en: "Hello. How much to go to the airport?",
  less: 10,
  traps: { th: ["มา", "ที่ไหน"], rom: ["maa", "têe năi"] }
},
{
  th: ["ไป", "พัทยา", "เท่าไหร่", "คะ"],
  rom: ["bpai", "pát-tá-yaa", "tâo rài", "ká"],
  en: "How much to go to Pattaya?",
  less: 10,
  traps: { th: ["ค่ะ", "อะไร"], rom: ["kâ", "à-rai"] }
},
{
  th: ["ไป", "ตลาด", "เท่าไหร่", "ครับ"],
  rom: ["bpai", "dtà-làat", "tâo rài", "kráp"],
  en: "How much to go to the market?",
  less: 10,
  traps: { th: ["มา", "ตลก"], rom: ["maa", "dtà-lòk"] }
},
{
  th: ["แพง", "เกินไป", "ครับ", "สอง", "ร้อย", "บาท", "ได้", "ไหม", "ครับ"],
  rom: ["paeng", "gern bpai", "kráp", "sŏng", "rói", "bàat", "dâai", "măi", "kráp"],
  en: "Too expensive. Can you do 200 baht?",
  less: 10
},
{
  th: ["ตรง", "ไป", "แล้ว", "เลี้ยว", "ขวา"],
  rom: ["dtrong", "bpai", "láew", "líeow", "kwăa"],
  en: "Go straight and then turn right.",
  less: 10,
  traps: { th: ["ซ้าย", "จอด"], rom: ["sáai", "jòt"] }
},
{
  th: ["จอด", "ตรง", "นี้", "ครับ", "ขอบคุณ", "ครับ"],
  rom: ["jòt", "dtrong", "née", "kráp", "kòp kun", "kráp"],
  en: "Stop here, thank you.",
  less: 10,
  traps: { th: ["นี่"], rom: ["nêe"] }
},
{
  th: ["เลี้ยว", "ซ้าย", "แล้ว", "จอด", "ตรง", "นั้น", "ค่ะ"],
  rom: ["líeow", "sáai", "láew", "jòt", "dtrong", "nán", "kâ"],
  en: "Turn left and then stop over there.",
  less: 10,
  traps: { th: ["นั่น", "ขวา"], rom: ["nân", "kwăa"] }
},
{
  th: ["ผม", "ซื้อ", "ผลไม้", "อยู่", "ครับ"],
  rom: ["pŏm", "séu", "pŏn-lá-mái", "yòo", "kráp"],
  en: "I'm buying fruit (right now).",
  less: 10,
  traps: { th: ["เป็น", "ออกกำลังกาย", "ผัก"], rom: ["bpen", "òk gam-lang gaai", "pàk"] }
},
{
  th: ["พรุ่งนี้", "ผม", "จะ", "ไป", "ซื้อ", "ผลไม้", "และ", "ผัก", "ที่", "ตลาด"],
  rom: ["prûng-née", "pŏm", "jà", "bpai", "séu", "pŏn-lá-mái", "láe", "pàk", "têe", "dtà-làat"],
  en: "Tomorrow I will go buy fruit and vegetables at the market.",
  less: 10,
  answers: [
    ["พรุ่งนี้", "ผม", "จะ", "ไป", "ซื้อ", "ผลไม้", "และ", "ผัก", "ที่", "ตลาด"],
    ["พรุ่งนี้", "ผม", "จะ", "ไป", "ซื้อ", "ผัก", "และ", "ผลไม้", "ที่", "ตลาด"],
    ["ผม", "จะ", "ไป", "ซื้อ", "ผลไม้", "และ", "ผัก", "ที่", "ตลาด", "พรุ่งนี้"],
    ["ผม", "จะ", "ไป", "ซื้อ", "ผัก", "และ", "ผลไม้", "ที่", "ตลาด", "พรุ่งนี้"]
  ],
  traps: { th: ["อยู่", "เมื่อวาน"], rom: ["yòo", "mêua waan"] }
},
{
  th: ["ผม", "ซื้อ", "อาหาร", "และ", "เครื่องดื่ม"],
  rom: ["pŏm", "séu", "aa-hăan", "láe", "krêuang dèum"],
  en: "I buy food and drinks.",
  less: 10,
  answers: [
    ["ผม", "ซื้อ", "อาหาร", "และ", "เครื่องดื่ม"],
    ["ผม", "ซื้อ", "เครื่องดื่ม", "และ", "อาหาร"]
  ],
  traps: { th: ["แล้ว"], rom: ["láew"] }
},
{
  th: ["ผม", "พูด", "ภาษา", "ไทย", "ได้", "แต่", "อ่าน", "ไม่ได้"],
  rom: ["pŏm", "pôot", "paa-săa", "Thai", "dâai", "dtàe", "àan", "mâi dâai"],
  en: "I can speak Thai, but I can't read it.",
  less: 10,
  traps: { th: ["ได้ยิน", "ไม่"], rom: ["dâai yin", "mâi"] }
},
{
  th: ["เลี้ยว", "ซ้าย", "ตรง", "นี้", "ไม่ได้"],
  rom: ["líeow", "sáai", "dtrong", "née", "mâi dâai"],
  en: "You can't turn left here.",
  less: 10,
  traps: { th: ["นี่", "ไม่"], rom: ["nêe", "mâi"] }
},
{
  th: ["เขา", "ไป", "ซื้อ", "ผลไม้", "ที่", "ตลาด"],
  rom: ["kăo", "bpai", "séu", "pŏn-lá-mái", "têe", "dtà-làat"],
  en: "He went to buy fruit at the market.",
  less: 10,
  traps: { th: ["และ", "เป็น"], rom: ["láe", "bpen"] }
},
{
  th: ["ผม", "พูด", "ภาษา", "ไทย", "ได้", "นิดหน่อย", "คุณ", "พูด", "ภาษา", "อังกฤษ", "ได้", "ไหม"],
  rom: ["pŏm", "pôot", "paa-săa", "Thai", "dâai", "nít nòi", "kun", "pôot", "paa-săa", "ang-grìt", "dâai", "măi"],
  en: "I can speak a little Thai. Can you speak English?",
  less: 10,
  traps: { th: ["ไม่", "ใช่"], rom: ["mâi", "châi"] }
},
{
  th: ["เมื่อวาน", "เขา", "ไม่ได้", "อยู่", "บ้าน", "เขา", "อยู่", "ที่", "โรงพยาบาล"],
  rom: ["mêua waan", "kăo", "mâi dâai", "yòo", "bâan", "kăo", "yòo", "têe", "rohng pá-yaa-baan"],
  en: "Yesterday he wasn't at home. He was at the hospital.",
  less: 10,
  answers: [
    ["เมื่อวาน", "เขา", "ไม่ได้", "อยู่", "บ้าน", "เขา", "อยู่", "ที่", "โรงพยาบาล"],
    ["เขา", "ไม่ได้", "อยู่", "บ้าน", "เมื่อวาน", "เขา", "อยู่", "ที่", "โรงพยาบาล"]
  ],
  traps: { th: ["เป็น", "คือ"], rom: ["bpen", "keu"] }
},
{
  th: ["ครู", "ใจดี", "มาก", "แต่", "พูด", "ภาษา", "อังกฤษ", "ไม่ได้"],
  rom: ["kroo", "jai dee", "mâak", "dtàe", "pôot", "paa-săa", "ang-grìt", "mâi dâai"],
  en: "The teacher is very kind, but she can't speak English.",
  less: 10,
  traps: { th: ["เป็น", "คือ"], rom: ["bpen", "keu"] }
},
{
  th: ["ผม", "ได้ยิน", "คุณ", "แต่", "ผม", "ไม่", "เข้าใจ"],
  rom: ["pŏm", "dâai yin", "kun", "dtàe", "pŏm", "mâi", "kâo jai"],
  en: "I heard you, but I don't understand.",
  less: 10,
  traps: { th: ["ได้", "เห็น"], rom: ["dâai", "hĕn"] }
},
{
  th: ["เมื่อวาน", "ฉัน", "ไม่ได้", "ไป", "ตลาด", "เพราะ", "เหนื่อย", "มาก"],
  rom: ["mêua waan", "chăn", "mâi dâai", "bpai", "dtà-làat", "prór", "nèuay", "mâak"],
  en: "Yesterday I didn't go to the market because I was very tired.",
  less: 10,
  answers: [
    ["เมื่อวาน", "ฉัน", "ไม่ได้", "ไป", "ตลาด", "เพราะ", "เหนื่อย", "มาก"],
    ["ฉัน", "ไม่ได้", "ไป", "ตลาด", "เมื่อวาน", "เพราะ", "เหนื่อย", "มาก"]
  ],
  traps: { th: ["เป็น", "ใช่"], rom: ["bpen", "châi"] }
},
{
  th: ["คนขาย", "ใจดี", "มาก", "แต่", "บอก", "ว่า", "ลด", "ไม่ได้"],
  rom: ["kon kăai", "jai dee", "mâak", "dtàe", "bòk", "wâa", "lót", "mâi dâai"],
  en: "The vendor is very nice, but she said she can't lower the price.",
  less: 10,
  traps: { th: ["หล่อ", "เป็น"], rom: ["lòr", "bpen"] }
},
{
  th: ["ผม", "จะ", "ไป", "ตลาด", "แล้ว", "ก็", "จะ", "ทำ", "อาหาร"],
  rom: ["pŏm", "jà", "bpai", "dtà-làat", "láew", "gôr", "jà", "tam", "aa-hăan"],
  en: "I will go to the market, and then I will cook.",
  less: 10,
  traps: { th: ["และ"], rom: ["láe"] }
},
{
  th: ["อาหาร", "ที่", "ตลาด", "ถูก", "และ", "อร่อย"],
  rom: ["aa-hăan", "têe", "dtà-làat", "tòok", "láe", "à-ròi"],
  en: "The food at the market is cheap and delicious.",
  less: 10,
  answers: [
    ["อาหาร", "ที่", "ตลาด", "ถูก", "และ", "อร่อย"],
    ["อาหาร", "ที่", "ตลาด", "อร่อย", "และ", "ถูก"]
  ]
},
{
  th: ["อาหาร", "ที่", "นี่", "อร่อย", "และ", "ถูก", "มาก"],
  rom: ["aa-hăan", "têe", "nêe", "à-ròi", "láe", "tòok", "mâak"],
  en: "The food here is delicious and very cheap.",
  less: 10,
  answers: [
    ["อาหาร", "ที่", "นี่", "อร่อย", "และ", "ถูก", "มาก"],
    ["อาหาร", "ที่", "นี่", "ถูก", "และ", "อร่อย", "มาก"]
  ],
  traps: { th: ["นี้"], rom: ["née"] }
},
{
  th: ["ภาษา", "ไทย", "ยาก", "เกิน", "ไป"],
  rom: ["paa-săa", "thai", "yâak", "gern", "bpai"],
  en: "Thai language is too difficult.",
  less: 10,
  traps: { th: ["เป็น", "คือ"], rom: ["bpen", "keu"] }
},
{
  th: ["อร่อย", "แต่", "เผ็ด", "เกิน", "ไป"],
  rom: ["à-ròi", "dtàe", "pèt", "gern", "bpai"],
  en: "It's delicious, but it's too spicy.",
  less: 10,
  traps: { th: ["และ", "อะไร"], rom: ["láe", "à-rai"] }
},

// ===== LESSON 11 (Possession) =====
{
  th: ["รถ", "ของ", "คุณ", "สวย", "มาก"],
  rom: ["rót", "kŏng", "kun", "sŭay", "mâak"],
  en: "Your car is very beautiful.",
  less: 11,
  traps: { th: ["ซวย"], rom: ["suay"] }
},
{
  th: ["หมา", "ของ", "คุณ", "น่า", "รัก", "มาก"],
  rom: ["măa", "kŏng", "kun", "nâa", "rák", "mâak"],
  en: "Your dog is very cute.",
  less: 11
},
{
  th: ["ครู", "ของ", "ผม", "ดี", "มาก"],
  rom: ["kroo", "kŏng", "pŏm", "dee", "mâak"],
  en: "My teacher is very good.",
  less: 11
},
{
  th: ["แม่", "ของ", "ฉัน", "สวย", "มาก"],
  rom: ["mâe", "kŏng", "chăn", "sŭay", "mâak"],
  en: "My mother is very beautiful.",
  less: 11,
  traps: { th: ["ซวย"], rom: ["suay"] }
},
{
  th: ["พ่อ", "ของ", "คุณ", "ตลก", "มาก"],
  rom: ["pôr", "kŏng", "kun", "dtà-lòk", "mâak"],
  en: "Your father is very funny.",
  less: 11,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["ลูก", "ของ", "คุณ", "น่า", "รัก", "มาก"],
  rom: ["lôok", "kŏng", "kun", "nâa", "rák", "mâak"],
  en: "Your child is very cute.",
  less: 11,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["พ่อแม่", "ของ", "ผม", "ฉลาด", "และ", "ใจ", "ดี"],
  rom: ["pôr mâe", "kŏng", "pŏm", "chà-làat", "láe", "jai", "dee"],
  en: "My parents are smart and kind.",
  less: 11,
  answers: [
    ["พ่อแม่", "ของ", "ผม", "ฉลาด", "และ", "ใจ", "ดี"],
    ["พ่อแม่", "ของ", "ผม", "ใจ", "ดี", "และ", "ฉลาด"]
  ]
},
{
  th: ["โทรศัพท์", "ของ", "ฉัน", "ช้า", "มาก"],
  rom: ["toh-rá-sàp", "kŏng", "chăn", "cháa", "mâak"],
  en: "My phone is very slow.",
  less: 11,
  traps: { th: ["ชา"], rom: ["chaa"] }
},
{
  th: ["รถ", "ของ", "ผม", "เร็ว", "มาก"],
  rom: ["rót", "kŏng", "pŏm", "reo", "mâak"],
  en: "My car is very fast.",
  less: 11,
  traps: { th: ["ช้า"], rom: ["cháa"] }
},
{
  th: ["บ้าน", "ของ", "คุณ", "ใหญ่", "และ", "สวย", "มาก"],
  rom: ["bâan", "kŏng", "kun", "yài", "láe", "sŭay", "mâak"],
  en: "Your house is big and very beautiful.",
  less: 11,
  answers: [
    ["บ้าน", "ของ", "คุณ", "ใหญ่", "และ", "สวย", "มาก"],
    ["บ้าน", "ของ", "คุณ", "สวย", "และ", "ใหญ่", "มาก"]
  ],
  traps: { th: ["เล็ก"], rom: ["lék"] }
},
{
  th: ["พูด", "ช้าๆ", "ได้", "ไหม"],
  rom: ["pôot", "cháa cháa", "dâai", "măi"],
  en: "Can you speak slowly?",
  less: 11,
  traps: { th: ["เร็ว"], rom: ["reo"] }
},
{
  th: ["นี่", "คือ", "รถ", "ของ", "ผม"],
  rom: ["nêe", "keu", "rót", "kŏng", "pŏm"],
  en: "This is my car.",
  less: 11,
  traps: { th: ["เป็น"], rom: ["bpen"] }
},
{
  th: ["นั่น", "คือ", "บ้าน", "ของ", "ฉัน"],
  rom: ["nân", "keu", "bâan", "kŏng", "chăn"],
  en: "That is my house.",
  less: 11,
  traps: { th: ["เป็น"], rom: ["bpen"] }
},
{
  th: ["เขา", "เป็น", "แฟน", "ผม"],
  rom: ["kăo", "bpen", "faen", "pŏm"],
  en: "She is my girlfriend.",
  less: 11,
  traps: { th: ["อยู่"], rom: ["yòo"] }
},
{
  th: ["พี่สาว", "ของ", "ฉัน", "อายุ", "สาม", "สิบ", "ปี", "น้องชาย", "อายุ", "สิบ", "หก", "ปี"],
  rom: ["pêe săao", "kŏng", "chăn", "aa-yú", "săam", "sìp", "bpee", "nóng chaai", "aa-yú", "sìp", "hòk", "bpee"],
  en: "My elder sister is 30 and my younger brother is 16.",
  less: 11,
  traps: { th: ["พี่ชาย", "น้องสาว"], rom: ["pêe chaai", "nóng săao"] }
},
{
  th: ["ปู่", "และ", "ย่า", "ของ", "ผม", "อยู่", "ที่", "ประเทศ", "ไทย"],
  rom: ["bpòo", "láe", "yâa", "kŏng", "pŏm", "yòo", "têe", "bprà-têt", "Thai"],
  en: "My grandpa and grandma (father's side) are in Thailand.",
  less: 11,
  answers: [
    ["ปู่", "และ", "ย่า", "ของ", "ผม", "อยู่", "ที่", "ประเทศ", "ไทย"],
    ["ย่า", "และ", "ปู่", "ของ", "ผม", "อยู่", "ที่", "ประเทศ", "ไทย"]
  ],
  traps: { th: ["ตา", "ยาย"], rom: ["dtaa", "yaai"] }
},
{
  th: ["น้องชาย", "ของ", "ผม", "ไม่ค่อย", "ชอบ", "เรียน", "แต่", "ชอบ", "เล่น", "เกม"],
  rom: ["nóng chaai", "kŏng", "pŏm", "mâi kôi", "chôp", "rian", "dtàe", "chôp", "lên", "gem"],
  en: "My younger brother doesn't really like studying, but he likes playing games.",
  less: 11,
  traps: { th: ["ไม่", "น้องสาว"], rom: ["mâi", "nóng săao"] }
},
{
  th: ["นี่", "คือ", "โทรศัพท์", "ของ", "คุณ", "ใช่", "ไหม"],
  rom: ["nêe", "keu", "toh-rá-sàp", "kŏng", "kun", "châi", "măi"],
  en: "This is your phone, right?",
  less: 11,
  traps: { th: ["เป็น"], rom: ["bpen"] }
},
{
  th: ["กุญแจ", "อยู่", "ที่", "ห้อง", "ของ", "ผม"],
  rom: ["gun-jae", "yòo", "têe", "hông", "kŏng", "pŏm"],
  en: "The key is in my room.",
  less: 11,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["แม่", "ของ", "ฉัน", "ชอบ", "ทำ", "อาหาร"],
  rom: ["mâe", "kŏng", "chăn", "chôp", "tam", "aa-hăan"],
  en: "My mother likes to cook.",
  less: 11
},
{
  th: ["แฟน", "ของ", "ผม", "อายุ", "ยี่สิบ", "ห้า", "ปี"],
  rom: ["faen", "kŏng", "pŏm", "aa-yú", "yêe-sìp", "hâa", "bpee"],
  en: "My girlfriend is 25 years old.",
  less: 11
},
{
  th: ["แมว", "ของ", "ฉัน", "ไม่", "ชอบ", "ดื่ม", "นม"],
  rom: ["maew", "kŏng", "chăn", "mâi", "chôp", "dèum", "nom"],
  en: "My cat doesn't like to drink milk.",
  less: 11
},
{
  th: ["ทำไม", "คุณ", "ชอบ", "งาน", "ของ", "คุณ"],
  rom: ["tam-mai", "kun", "chôp", "ngaan", "kŏng", "kun"],
  en: "Why do you like your job?",
  less: 11,
  answers: [
    ["ทำไม", "คุณ", "ชอบ", "งาน", "ของ", "คุณ"],
    ["คุณ", "ชอบ", "งาน", "ของ", "คุณ", "ทำไม"]
  ]
},
{
  th: ["แฟน", "ของ", "ผม", "มา", "จาก", "อเมริกา"],
  rom: ["faen", "kŏng", "pŏm", "maa", "jàak", "à-may-rí-gaa"],
  en: "My girlfriend is from America.",
  less: 11
},
{
  th: ["แฟน", "ของ", "ผม", "เป็น", "คน", "อเมริกัน"],
  rom: ["faen", "kŏng", "pŏm", "bpen", "kon", "à-may-rí-gan"],
  en: "My girlfriend is American.",
  less: 11,
  traps: { th: ["เพื่อน"], rom: ["pêuan"] }
},
{
  th: ["ภรรยา", "ของ", "ผม", "เป็น", "คน", "ไทย"],
  rom: ["pan-rá-yaa", "kŏng", "pŏm", "bpen", "kon", "Thai"],
  en: "My wife is Thai.",
  less: 11,
  traps: { th: ["สามี"], rom: ["săa-mee"] }
},
{
  th: ["สามี", "ของ", "ฉัน", "เป็น", "คน", "อเมริกัน"],
  rom: ["săa-mee", "kŏng", "chăn", "bpen", "kon", "à-may-rí-gan"],
  en: "My husband is American.",
  less: 11,
  traps: { th: ["ภรรยา"], rom: ["pan-rá-yaa"] }
},
{
  th: ["แม่", "ของ", "ผม", "เป็น", "ครู"],
  rom: ["mâe", "kŏng", "pŏm", "bpen", "kroo"],
  en: "My mother is a teacher.",
  less: 11,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["พ่อ", "ของ", "ฉัน", "เป็น", "หมอ"],
  rom: ["pôr", "kŏng", "chăn", "bpen", "mŏr"],
  en: "My father is a doctor.",
  less: 11,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["ผม", "รัก", "ภรรยา", "ของ", "ผม"],
  rom: ["pŏm", "rák", "pan-rá-yaa", "kŏng", "pŏm"],
  en: "I love my wife.",
  less: 11
},
{
  th: ["แม่", "ของ", "คุณ", "อายุ", "เท่าไหร่"],
  rom: ["mâe", "kŏng", "kun", "aa-yú", "tâo rài"],
  en: "How old is your mother?",
  less: 11,
  traps: { th: ["อะไร"], rom: ["à-rai"] }
},
{
  th: ["แม่", "ของ", "คุณ", "ชื่อ", "อะไร"],
  rom: ["mâe", "kŏng", "kun", "chûu", "à-rai"],
  en: "What is your mother's name?",
  less: 11,
  traps: { th: ["ไหม"], rom: ["măi"] }
},
{
  th: ["พ่อ", "ของ", "คุณ", "ชื่อ", "อะไร"],
  rom: ["pôr", "kŏng", "kun", "chûu", "à-rai"],
  en: "What is your father's name?",
  less: 11,
  traps: { th: ["เท่าไหร่"], rom: ["tâo rài"] }
},
{
  th: ["แฟน", "ของ", "ผม", "ชื่อ", "โซฟี"],
  rom: ["faen", "kŏng", "pŏm", "chûu", "Sophie"],
  en: "My girlfriend's name is Sophie.",
  less: 11
},
{
  th: ["แล้ว", "แฟน", "ของ", "คุณ", "ล่ะ"],
  rom: ["láew", "faen", "kŏng", "kun", "lâ"],
  en: "And what about your girlfriend?",
  less: 11,
  traps: { th: ["ไหม"], rom: ["măi"] }
},
{
  th: ["แล้ว", "พ่อ", "ของ", "คุณ", "ล่ะ"],
  rom: ["láew", "pôr", "kŏng", "kun", "lâ"],
  en: "And what about your father?",
  less: 11,
  traps: { th: ["ไหม"], rom: ["măi"] }
},
{
  th: ["เพื่อน", "ของ", "ผม", "ใจดี", "และ", "ตลก"],
  rom: ["pêuan", "kŏng", "pŏm", "jai dee", "láe", "dtà-lòk"],
  en: "My friend is kind and funny.",
  less: 11,
  answers: [
    ["เพื่อน", "ของ", "ผม", "ใจดี", "และ", "ตลก"],
    ["เพื่อน", "ของ", "ผม", "ตลก", "และ", "ใจดี"]
  ]
},
{
  th: ["เพื่อน", "ของ", "ฉัน", "พูด", "ภาษา", "ไทย", "ได้"],
  rom: ["pêuan", "kŏng", "chăn", "pôot", "paa-săa", "Thai", "dâai"],
  en: "My friend can speak Thai.",
  less: 11
},
{
  th: ["พ่อ", "ของ", "แฟน", "ผม", "อายุ", "แปดสิบ", "ปี"],
  rom: ["pôr", "kŏng", "faen", "pŏm", "aa-yú", "bpàet-sìp", "bpee"],
  en: "My girlfriend's father is 80 years old.",
  less: 11
},
{
  th: ["ผม", "ซื้อ", "ของ", "ที่", "ตลาด"],
  rom: ["pŏm", "séu", "kŏng", "têe", "dtà-làat"],
  en: "I buy stuff at the market.",
  less: 11,
  traps: { th: ["สี่"], rom: ["sèe"] }
},
{
  th: ["ครอบครัว", "ของ", "ผม", "อยู่", "ที่", "อเมริกา"],
  rom: ["krôp krua", "kŏng", "pŏm", "yòo", "têe", "à-may-rí-gaa"],
  en: "My family is in America.",
  less: 11,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  th: ["ลูกชาย", "ของ", "ฉัน", "เป็น", "หมอ"],
  rom: ["lôok chaai", "kŏng", "chăn", "bpen", "mŏr"],
  en: "My son is a doctor.",
  less: 11,
  traps: { th: ["ลูกสาว", "คือ"], rom: ["lôok săao", "keu"] }
},
{
  th: ["น้องสาว", "ของ", "ผม", "สวย", "และ", "ฉลาด"],
  rom: ["nóng săao", "kŏng", "pŏm", "sŭay", "láe", "chà-làat"],
  en: "My younger sister is beautiful and smart.",
  less: 11,
  answers: [
    ["น้องสาว", "ของ", "ผม", "สวย", "และ", "ฉลาด"],
    ["น้องสาว", "ของ", "ผม", "ฉลาด", "และ", "สวย"]
  ],
  traps: { th: ["น้องชาย", "แล้ว"], rom: ["nóng chaai", "láew"] }
},
{
  th: ["พี่ชาย", "ของ", "ฉัน", "ชอบ", "กิน", "อาหารไทย"],
  rom: ["pêe chaai", "kŏng", "chăn", "chôp", "gin", "aa-hăan Thai"],
  en: "My elder brother likes to eat Thai food.",
  less: 11,
  traps: { th: ["พี่สาว"], rom: ["pêe săao"] }
},
{
  th: ["ฉัน", "ลืม", "กระเป๋าตังค์", "ไว้", "ที่", "บ้าน", "เพื่อน"],
  rom: ["chăn", "leum", "grà-bpăo dtang", "wái", "têe", "bâan", "pêuan"],
  en: "I forgot my wallet at my friend’s house.",
  less: 11
},
{
  th: ["ผม", "ลืม", "กุญแจ", "ไว้", "ใน", "รถ"],
  rom: ["pŏm", "leum", "gun-jae", "wái", "nai", "rót"],
  en: "I forgot the key in the car.",
  less: 11,
  traps: { th: ["ไหน"], rom: ["năi"] }
},

// ===== LESSON 12 (Having) =====
{
  th: ["ผม", "มี", "หมา", "สอง", "ตัว"],
  rom: ["pŏm", "mee", "măa", "sŏng", "dtua"],
  en: "I have two dogs.",
  less: 12,
  traps: { th: ["คัน", "คน", "อัน"], rom: ["kan", "kon", "an"] }
},
{
  th: ["ฉัน", "มี", "แมว", "สาม", "ตัว"],
  rom: ["chăn", "mee", "maew", "săam", "dtua"],
  en: "I have three cats.",
  less: 12,
  traps: { th: ["คัน", "คน", "หลัง"], rom: ["kan", "kon", "lăng"] }
},
{
  th: ["ผม", "ไม่", "มี", "รถยนต์", "แต่", "พ่อ", "ของ", "ผม", "มี", "สอง", "คัน"],
  rom: ["pŏm", "mâi", "mee", "rót yon", "dtàe", "pôr", "kŏng", "pŏm", "mee", "sŏng", "kan"],
  en: "I don't have a car, but my father has two.",
  less: 12,
  traps: { th: ["ตัว", "คน", "และ"], rom: ["dtua", "kon", "láe"] }
},
{
  th: ["คุณ", "มี", "รถยนต์", "หรือ", "มอเตอร์ไซค์", "ไหม"],
  rom: ["kun", "mee", "rót yon", "rĕu", "mor-dtêr-sai", "măi"],
  en: "Do you have a car or a motorcycle?",
  less: 12,
  answers: [
    ["คุณ", "มี", "รถยนต์", "หรือ", "มอเตอร์ไซค์", "ไหม"],
    ["คุณ", "มี", "มอเตอร์ไซค์", "หรือ", "รถยนต์", "ไหม"]
  ],
  traps: { th: ["คัน", "เหรอ"], rom: ["kan", "rŏr"] }
},
{
  th: ["ผม", "มี", "รถยนต์", "สอง", "คัน"],
  rom: ["pŏm", "mee", "rót yon", "sŏng", "kan"],
  en: "I have two cars.",
  less: 12,
  traps: { th: ["ตัว", "คน", "อัน"], rom: ["dtua", "kon", "an"] }
},
{
  th: ["เขา", "มี", "มอเตอร์ไซค์", "หนึ่ง", "คัน"],
  rom: ["kăo", "mee", "mor-dtêr-sai", "nèung", "kan"],
  en: "He/she has one motorbike.",
  less: 12,
  traps: { th: ["ตัว", "คน", "หลัง"], rom: ["dtua", "kon", "lăng"] }
},
{
  th: ["ขอโทษ", "ครับ", "วันนี้", "ผม", "ไม่", "มี", "เวลา"],
  rom: ["kŏr tôht", "kráp", "wan née", "pŏm", "mâi", "mee", "way-laa"],
  en: "Sorry, I don't have time today.",
  less: 12,
  answers: [
    ["ขอโทษ", "ครับ", "วันนี้", "ผม", "ไม่", "มี", "เวลา"],
    ["ขอโทษ", "ครับ", "ผม", "ไม่", "มี", "เวลา", "วันนี้"]
  ],
},
{
  th: ["พรุ่งนี้", "คุณ", "มี", "เวลา", "ไหม"],
  rom: ["prûng née", "kun", "mee", "way-laa", "măi"],
  en: "Do you have time tomorrow?",
  less: 12,
  answers: [
    ["พรุ่งนี้", "คุณ", "มี", "เวลา", "ไหม"],
    ["คุณ", "มี", "เวลา", "พรุ่งนี้", "ไหม"]
  ],
},
{
  th: ["ผม", "ไม่มี", "เงิน", "ซื้อ", "รถยนต์"],
  rom: ["pŏm", "mâi mee", "ngern", "séu", "rót yon"],
  en: "I don't have money to buy a car.",
  less: 12
},
{
  th: ["ผม", "มี", "คำถาม", "สำคัญ"],
  rom: ["pŏm", "mee", "kam-tăam", "săm-kan"],
  en: "I have an important question.",
  less: 12
},
{
  th: ["คุณ", "มี", "ปากกา", "ไหม", "ครับ"],
  rom: ["kun", "mee", "bpàak gaa", "măi", "kráp"],
  en: "Do you have a pen?",
  less: 12
},
{
  th: ["ฉัน", "ไม่", "มี", "กุญแจ"],
  rom: ["chăn", "mâi", "mee", "gun-jae"],
  en: "I don't have the key.",
  less: 12
},
{
  th: ["แฟน", "ของ", "ผม", "มี", "แมว", "สอง", "ตัว"],
  rom: ["faen", "kŏng", "pŏm", "mee", "maew", "sŏng", "dtua"],
  en: "My girlfriend has two cats.",
  less: 12
},
{
  th: ["เพื่อน", "ของ", "ฉัน", "มี", "มอเตอร์ไซค์"],
  rom: ["pêuan", "kŏng", "chăn", "mee", "mor-dtêr-sai"],
  en: "My friend has a motorbike.",
  less: 12
},
{
  th: ["พ่อแม่", "ของ", "ผม", "ไม่", "มี", "เวลา"],
  rom: ["pôr mâe", "kŏng", "pŏm", "mâi", "mee", "way-laa"],
  en: "My parents don't have time.",
  less: 12
},
{
  th: ["คุณ", "มี", "หมา", "หรือ", "แมว", "ไหม"],
  rom: ["kun", "mee", "măa", "rĕu", "maew", "măi"],
  en: "Do you have a dog or a cat?",
  less: 12,
  answers: [
    ["คุณ", "มี", "หมา", "หรือ", "แมว", "ไหม"],
    ["คุณ", "มี", "แมว", "หรือ", "หมา", "ไหม"]
  ],
  traps: { th: ["แต่"], rom: ["dtàe"] }
},
{
  th: ["คุณ", "มี", "แฟน", "ไหม", "คะ"],
  rom: ["kun", "mee", "faen", "măi", "ká"],
  en: "Do you have a boyfriend/girlfriend?",
  less: 12,
  traps: { th: ["อะไร"], rom: ["à-rai"] }
},
{
  th: ["ผม", "ไม่", "มี", "รถยนต์", "แต่", "มี", "มอเตอร์ไซค์"],
  rom: ["pŏm", "mâi", "mee", "rót yon", "dtàe", "mee", "mor-dtêr-sai"],
  en: "I don't have a car, but I have a motorbike.",
  less: 12,
  traps: { th: ["หรือ"], rom: ["rĕu"] }
},
{
  th: ["คุณ", "มี", "หมา", "กี่", "ตัว"],
  rom: ["kun", "mee", "măa", "gèe", "dtua"],
  en: "How many dogs do you have?",
  less: 12,
  traps: { th: ["เท่าไหร่"], rom: ["tâo rài"] }
},
{
  th: ["คุณ", "มี", "รถยนต์", "กี่", "คัน"],
  rom: ["kun", "mee", "rót yon", "gèe", "kan"],
  en: "How many cars do you have?",
  less: 12,
  traps: { th: ["ตัว", "คน", "เท่าไหร่"], rom: ["dtua", "kon", "tâo rài"] }
},
{
  th: ["คุณ", "มี", "ลูก", "กี่", "คน"],
  rom: ["kun", "mee", "lôok", "gèe", "kon"],
  en: "How many children do you have?",
  less: 12,
  traps: { th: ["เท่าไหร่", "คัน", "อัน"], rom: ["tâo rài", "kan", "an"] }
},
{
  th: ["คุณ", "มี", "พี่น้อง", "กี่", "คน"],
  rom: ["kun", "mee", "pêe nóng", "gèe", "kon"],
  en: "How many siblings do you have?",
  less: 12,
  traps: { th: ["ตัว", "คัน", "อัน"], rom: ["dtua", "kan", "an"] }
},
{
  th: ["ผม", "ไม่", "มี", "พี่น้อง", "แต่", "แฟน", "ของ", "ผม", "มี", "พี่น้อง", "สาม", "คน"],
  rom: ["pŏm", "mâi", "mee", "pêe nóng", "dtàe", "faen", "kŏng", "pŏm", "mee", "pêe nóng", "săam", "kon"],
  en: "I don't have any siblings, but my girlfriend has three.",
  less: 12,
  traps: { th: ["คัน"], rom: ["kan"] }
},
{
  th: ["ฉัน", "มี", "พี่ชาย", "หนึ่ง", "คน"],
  rom: ["chăn", "mee", "pêe chaai", "nèung", "kon"],
  en: "I have one elder brother.",
  less: 12,
  traps: { th: ["ตัว", "พี่น้อง"], rom: ["dtua", "pêe nóng"] }
},
{
  th: ["ผม", "มี", "พี่สาว", "สอง", "คน"],
  rom: ["pŏm", "mee", "pêe săao", "sŏng", "kon"],
  en: "I have two elder sisters.",
  less: 12,
  traps: { th: ["คัน", "พี่ชาย"], rom: ["kan", "pêe chaai"] }
},
{
  th: ["พวก", "เขา", "มี", "หมา", "น่ารัก", "มาก"],
  rom: ["pûak", "kăo", "mee", "măa", "nâa-rák", "mâak"],
  en: "They have a very cute dog.",
  less: 12,
  traps: { th: ["ตัว"], rom: ["dtua"] }
},
{
  th: ["คืนนี้", "แฟน", "ของ", "ผม", "มี", "นัด", "ครับ"],
  rom: ["keun née", "faen", "kŏng", "pŏm", "mee", "nát", "kráp"],
  en: "Tonight my girlfriend has an appointment.",
  less: 12,
  answers: [
    ["คืนนี้", "แฟน", "ของ", "ผม", "มี", "นัด", "ครับ"],
    ["แฟน", "ของ", "ผม", "มี", "นัด", "คืนนี้", "ครับ"]
  ]
},
{
  th: ["เมื่อวาน", "ผม", "มี", "ประชุม", "สำคัญ"],
  rom: ["mêua waan", "pŏm", "mee", "bprà-chum", "săm-kan"],
  en: "Yesterday, I had an important meeting.",
  less: 12,
  answers: [
    ["เมื่อวาน", "ผม", "มี", "ประชุม", "สำคัญ"],
    ["ผม", "มี", "ประชุม", "สำคัญ", "เมื่อวาน"]
  ]
},
{
  th: ["ขอโทษครับ", "ผม", "มี", "ประชุม", "สำคัญ"],
  rom: ["kŏr tôht kráp", "pŏm", "mee", "bprà-chum", "săm-kan"],
  en: "Sorry, I have an important meeting.",
  less: 12
},
{
  th: ["พวก", "เขา", "มี", "รถยนต์", "สี่", "คัน"],
  rom: ["pûak", "kăo", "mee", "rót yon", "sèe", "kan"],
  en: "They have four cars.",
  less: 12,
  traps: { th: ["คน", "ข้าว"], rom: ["kon", "kâao"] }
},
{
  th: ["ทำไม", "เขา", "มี", "รถยนต์", "สี่", "คัน"],
  rom: ["tam-mai", "kăo", "mee", "rót yon", "sèe", "kan"],
  en: "Why does he have four cars?",
  less: 12,
  answers: [
    ["ทำไม", "เขา", "มี", "รถยนต์", "สี่", "คัน"],
    ["เขา", "มี", "รถยนต์", "สี่", "คัน", "ทำไม"]
  ]
},
{
  th: ["เพราะ", "เขา", "รวย", "และ", "ชอบ", "รถยนต์"],
  rom: ["prór", "kăo", "ruay", "láe", "chôp", "rót yon"],
  en: "Because he is rich and likes cars.",
  less: 12
},
{
  th: ["เพื่อน", "ของ", "ฉัน", "มี", "หมา", "น่ารัก", "สาม", "ตัว"],
  rom: ["pêuan", "kŏng", "chăn", "mee", "măa", "nâa-rák", "săam", "dtua"],
  en: "My friend has three cute dogs.",
  less: 12
},
{
  th: ["พ่อแม่", "ของ", "คุณ", "มี", "รถยนต์", "กี่", "คัน"],
  rom: ["pôr mâe", "kŏng", "kun", "mee", "rót yon", "gèe", "kan"],
  en: "How many cars do your parents have?",
  less: 12,
  traps: { th: ["เท่าไหร่", "คน"], rom: ["tâo rài", "kon"] }
},
{
  th: ["แฟน", "ของ", "ฉัน", "มี", "พี่น้อง", "สอง", "คน"],
  rom: ["faen", "kŏng", "chăn", "mee", "pêe nóng", "sŏng", "kon"],
  en: "My boyfriend has two siblings.",
  less: 12,
  traps: { th: ["สามี"], rom: ["săa-mee"] }
},
{
  th: ["เรา", "มี", "ลูกชาย", "สอง", "คน", "และ", "ลูกสาว", "หนึ่ง", "คน"],
  rom: ["rao", "mee", "lôok chaai", "sŏng", "kon", "láe", "lôok săao", "nèung", "kon"],
  en: "We have two sons and one daughter.",
  less: 12,
  answers: [
    ["เรา", "มี", "ลูกชาย", "สอง", "คน", "และ", "ลูกสาว", "หนึ่ง", "คน"],
    ["เรา", "มี", "ลูกสาว", "หนึ่ง", "คน", "และ", "ลูกชาย", "สอง", "คน"]
  ]
},
{
  th: ["อัน", "นี้", "ดี", "กว่า", "อัน", "นั้น"],
  rom: ["an", "née", "dee", "gwàa", "an", "nán"],
  en: "This one is better than that one.",
  less: 12,
  traps: { th: ["นี่", "นั่น"], rom: ["nêe", "nân"] }
},
{
  th: ["บ้าน", "ของ", "ผม", "เล็ก", "กว่า", "บ้าน", "ของ", "คุณ"],
  rom: ["bâan", "kŏng", "pŏm", "lék", "gwàa", "bâan", "kŏng", "kun"],
  en: "My house is smaller than your house.",
  less: 12,
  traps: { th: ["ใหญ่"], rom: ["yài"] }
},
{
  th: ["เรา", "มี", "บ้าน", "หนึ่ง", "หลัง", "และ", "รถยนต์", "สอง", "คัน"],
  rom: ["rao", "mee", "bâan", "nèung", "lăng", "láe", "rót yon", "sŏng", "kan"],
  en: "We have one house and two cars.",
  less: 12,
  answers: [
    ["เรา", "มี", "บ้าน", "หนึ่ง", "หลัง", "และ", "รถยนต์", "สอง", "คัน"],
    ["เรา", "มี", "รถยนต์", "สอง", "คัน", "และ", "บ้าน", "หนึ่ง", "หลัง"]
  ]
},
{
  th: ["เขา", "มี", "รถยนต์", "แพง", "ห้า", "คัน"],
  rom: ["kăo", "mee", "rót yon", "paeng", "hâa", "kan"],
  en: "He/she has five expensive cars.",
  less: 12,
  traps: { th: ["ถูก"], rom: ["tòok"] }
},
{
  th: ["พ่อ", "ของ", "ผม", "มี", "เงิน", "มาก"],
  rom: ["pôr", "kŏng", "pŏm", "mee", "ngern", "mâak"],
  en: "My father has a lot of money.",
  less: 12
},
{
  th: ["คุณ", "มี", "ใหญ่", "กว่า", "นี้", "ไหม", "ครับ"],
  rom: ["kun", "mee", "yài", "gwàa", "née", "măi", "kráp"],
  en: "Do you have a bigger size?",
  less: 12,
  traps: { th: ["เล็ก"], rom: ["lék"] }
},
{
  th: ["เขา", "เป็น", "คน", "รวย", "และ", "มี", "บ้าน", "ใหญ่"],
  rom: ["kăo", "bpen", "kon", "ruay", "láe", "mee", "bâan", "yài"],
  en: "He/she is a rich person and has a big house.",
  less: 12,
  traps: { th: ["เล็ก"], rom: ["lék"] }
},
{
  th: ["ผม", "ไม่", "มี", "เงิน", "และ", "ไม่", "มี", "เวลา"],
  rom: ["pŏm", "mâi", "mee", "ngern", "láe", "mâi", "mee", "way-laa"],
  en: "I don't have money and I don't have time.",
  less: 12,
  answers: [
    ["ผม", "ไม่", "มี", "เงิน", "และ", "ไม่", "มี", "เวลา"],
    ["ผม", "ไม่", "มี", "เวลา", "และ", "ไม่", "มี", "เงิน"]
  ]
},
{
  th: ["พวก", "เขา", "มี", "ลูก", "สาม", "คน", "และ", "บ้าน", "ใหญ่"],
  rom: ["pûak", "kăo", "mee", "lôok", "săam", "kon", "láe", "bâan", "yài"],
  en: "They have three children and a big house.",
  less: 12,
  answers: [
    ["พวก", "เขา", "มี", "ลูก", "สาม", "คน", "และ", "บ้าน", "ใหญ่"],
    ["พวก", "เขา", "มี", "บ้าน", "ใหญ่", "และ", "ลูก", "สาม", "คน"]
  ],
  traps: { th: ["เล็ก"], rom: ["lék"] }
},
{
  th: ["พวก", "เขา", "ไม่", "มี", "รถยนต์", "แต่", "มี", "มอเตอร์ไซค์", "สอง", "คัน"],
  rom: ["pûak", "kăo", "mâi", "mee", "rót yon", "dtàe", "mee", "mor-dtêr-sai", "sŏng", "kan"],
  en: "They don't have a car, but they have two motorbikes.",
  less: 12
},
{
  th: ["ใน", "ห้อง", "มี", "แมว", "สอง", "ตัว"],
  rom: ["nai", "hông", "mee", "maew", "sŏng", "dtua"],
  en: "There are two cats in the room.",
  less: 12,
  answers: [
    ["ใน", "ห้อง", "มี", "แมว", "สอง", "ตัว"],
    ["มี", "แมว", "สอง", "ตัว", "ใน", "ห้อง"]
  ],
  traps: { th: ["บ้าน"], rom: ["bâan"] }
},
{
  th: ["เรา", "มี", "เพื่อน", "ที่", "ญี่ปุ่น", "สาม", "คน"],
  rom: ["rao", "mee", "pêuan", "têe", "yêe-bpùn", "săam", "kon"],
  en: "We have three friends in Japan.",
  less: 12,
  traps: { th: ["คัน"], rom: ["kan"] }
},
{
  th: ["เรา", "ไม่", "มี", "เวลา", "เพราะ", "เรา", "มี", "ประชุม", "สำคัญ"],
  rom: ["rao", "mâi", "mee", "way-laa", "prór", "rao", "mee", "bprà-chum", "săm-kan"],
  en: "We don't have time because we have an important meeting.",
  less: 12
},
{
  th: ["เธอ", "มี", "พี่น้อง", "กี่", "คน"],
  rom: ["ter", "mee", "pêe nóng", "gèe", "kon"],
  en: "How many siblings do you have? (informal)",
  less: 12,
  traps: { th: ["คัน"], rom: ["kan"] }
},
{
  th: ["เธอ", "มี", "หมา", "น่ารัก", "มาก", "ชื่อ", "อะไร"],
  rom: ["ter", "mee", "măa", "nâa-rák", "mâak", "chûu", "à-rai"],
  en: "You have a very cute dog. What's its name? (informal)",
  less: 12
},

// ===== LESSON 13 (Restaurant, Cafe) =====
{
  th: ["ขอ", "เมนู", "ครับ"],
  rom: ["kŏr", "menu", "kráp"],
  en: "I would like a menu.",
  less: 13
},
{
  th: ["ขอ", "ผัดไทย", "กุ้ง", "ไม่", "เผ็ด", "สอง", "จาน", "ครับ"],
  rom: ["kŏr", "pàt thai", "gûng", "mâi", "pèt", "sŏng", "jaan", "kráp"],
  en: "I would like two plates of shrimp Pad Thai, not spicy.",
  less: 13,
  traps: { th: ["ชาม", "ไม่ใช่"], rom: ["chaam", "mâi châi"] }
},
{
  th: ["เอา", "ผัดไทย", "ไก่", "หนึ่ง", "จาน", "และ", "โค้ก", "สอง", "ขวด", "ครับ"],
  rom: ["ao", "pàt thai", "gài", "nèung", "jaan", "láe", "kóhk", "sŏng", "kùat", "kráp"],
  en: "I’ll have one plate of chicken Pad Thai and two bottles of Coke.",
  less: 13,
  traps: { th: ["แก้ว", "ชาม"], rom: ["gâew", "chaam"] }
},
{
  th: ["ขอ", "ต้มยำ", "กุ้ง", "สาม", "ชาม", "และ", "ข้าวสวย", "สอง", "จาน", "ค่ะ"],
  rom: ["kŏr", "dtôm-yam", "gûng", "săam", "chaam", "láe", "kâao sŭay", "sŏng", "jaan", "kâ"],
  en: "I would like three bowls of tom yum shrimp and two plates of steamed rice.",
  less: 13,
  traps: { th: ["ข้าวเหนียว", "แก้ว"], rom: ["kâao nĭeow", "gâew"] }
},
{
  th: ["ขอ", "ส้มตำ", "ไม่", "เผ็ด", "ค่ะ"],
  rom: ["kŏr", "sôm dtam", "mâi", "pèt", "kâ"],
  en: "I would like a papaya salad, not spicy.",
  less: 13
},
{
  th: ["ขอ", "ผัดกะเพรา", "หมู", "ไม่", "เผ็ด", "ครับ"],
  rom: ["kŏr", "pàt gà prao", "mŏo", "mâi", "pèt", "kráp"],
  en: "I would like pork stir-fried basil, not spicy.",
  less: 13
},
{
  th: ["เอา", "ผัดกะเพรา", "ไก่", "เผ็ด", "มาก", "ครับ"],
  rom: ["ao", "pàt gà prao", "gài", "pèt", "mâak", "kráp"],
  en: "I’ll have chicken stir-fried basil, very spicy.",
  less: 13
},
{
  th: ["ขอ", "ผัดซีอิ๊ว", "หมู", "สอง", "กล่อง", "กลับบ้าน", "ครับ"],
  rom: ["kŏr", "pàt-see-íw", "mŏo", "sŏng", "glòng", "glàp bâan", "kráp"],
  en: "I would like two boxes of pork pad see ew to take home.",
  less: 13
},
{
  th: ["ขอ", "อัน", "นี้", "ครับ"],
  rom: ["kŏr", "an", "née", "kráp"],
  en: "I would like this one.",
  less: 13,
  traps: { th: ["นี่"], rom: ["nêe"] }
},
{
  th: ["เรา", "ไป", "ร้าน", "อาหาร", "ไทย", "บ่อย ๆ"],
  rom: ["rao", "bpai", "ráan", "aa-hăan", "thai", "bòi bòi"],
  en: "We often go to Thai restaurants.",
  less: 13,
  traps: { th: ["บางที"], rom: ["baang-tee"] }
},
{
  th: ["เอา", "อัน", "นั้น", "ค่ะ"],
  rom: ["ao", "an", "nán", "kâ"],
  en: "I would like that one.",
  less: 13,
  traps: { th: ["นั่น"], rom: ["nân"] }
},
{
  th: ["ขอ", "ผัดไทย", "กุ้ง", "กลับบ้าน", "ครับ"],
  rom: ["kŏr", "pàt thai", "gûng", "glàp bâan", "kráp"],
  en: "I would like a shrimp Pad Thai for takeaway.",
  less: 13
},
{
  th: ["ขอ", "ส้มตำ", "สอง", "จาน", "ค่ะ"],
  rom: ["kŏr", "sôm dtam", "sŏng", "jaan", "kâ"],
  en: "I would like two plates of papaya salad.",
  less: 13
},
{
  th: ["เอา", "ก๋วยเตี๋ยว", "สาม", "ชาม", "ครับ"],
  rom: ["ao", "gŭay-dtĭeow", "săam", "chaam", "kráp"],
  en: "I want three bowls of noodle soup.",
  less: 13
},
{
  th: ["ขอ", "กาแฟ", "สี่", "แก้ว", "ค่ะ"],
  rom: ["kŏr", "gaa-fae", "sèe", "gâew", "kâ"],
  en: "I would like four cups of coffee.",
  less: 13
},
{
  th: ["เอา", "เบียร์", "สอง", "ขวด", "ครับ"],
  rom: ["ao", "bia", "sŏng", "kùat", "kráp"],
  en: "I want two bottles of beer.",
  less: 13,
  traps: { th: ["จาน"], rom: ["jaan"] }
},
{
  th: ["ขอ", "น้ำ", "หนึ่ง", "ขวด", "ค่ะ"],
  rom: ["kŏr", "náam", "nèung", "kùat", "kâ"],
  en: "I would like one bottle of water.",
  less: 13,
  traps: { th: ["ชาม"], rom: ["chaam"] }
},
{
  th: ["เอา", "ไวน์แดง", "สอง", "แก้ว", "ครับ"],
  rom: ["ao", "wai daeng", "sŏng", "gâew", "kráp"],
  en: "I want two glasses of red wine.",
  less: 13,
  traps: { th: ["จาน"], rom: ["jaan"] }
},
{
  th: ["ขอ", "ผัดซีอิ๊ว", "สอง", "จาน", "ครับ"],
  rom: ["kŏr", "pàt-see-íw", "sŏng", "jaan", "kráp"],
  en: "I would like two plates of pad see ew.",
  less: 13,
  traps: { th: ["แก้ว"], rom: ["gâew"] }
},
{
  th: ["ขอ", "ต้มยำ", "ไก่", "สาม", "ชาม", "ค่ะ"],
  rom: ["kŏr", "tôm yam", "gài", "săam", "chaam", "kâ"],
  en: "I would like three bowls of chicken Tom Yum.",
  less: 13,
  traps: { th: ["ขวด"], rom: ["kùat"] }
},
{
  th: ["ขอ", "แกงเขียวหวาน", "ไก่", "ครับ"],
  rom: ["kŏr", "gaeng kĭeow wăan", "gài", "kráp"],
  en: "I would like chicken green curry.",
  less: 13
},
{
  th: ["เอา", "แกงมัสมั่น", "เนื้อ", "สอง", "ถ้วย", "ครับ"],
  rom: ["ao", "gaeng má-sà-màn", "néua", "sŏng", "tûay", "kráp"],
  en: "I want two small bowls of beef massaman curry.",
  less: 13,
  traps: { th: ["ขวด"], rom: ["kùat"] }
},
{
  th: ["ขอ", "ข้าวเหนียวมะม่วง", "สอง", "จาน", "ค่ะ"],
  rom: ["kŏr", "kâao nĭeow má-mûang", "sŏng", "jaan", "kâ"],
  en: "I would like two plates of mango sticky rice.",
  less: 13,
  traps: { th: ["แก้ว"], rom: ["gâew"] }
},
{
  th: ["ขอ", "ผัดไทย", "สอง", "กล่อง", "ครับ"],
  rom: ["kŏr", "pàt thai", "sŏng", "glòng", "kráp"],
  en: "I would like two boxes of Pad Thai for takeaway.",
  less: 13
},
{
  th: ["เอา", "ต้มยำ", "ไก่", "สาม", "ถุง", "ครับ"],
  rom: ["ao", "tôm yam", "gài", "săam", "tŭng", "kráp"],
  en: "I want three bags of chicken Tom Yum for takeaway.",
  less: 13
},
{
  th: ["ขอ", "ข้าวเหนียวมะม่วง", "สาม", "กล่อง", "กลับบ้าน", "ค่ะ"],
  rom: ["kŏr", "kâao nĭeow má-mûang", "săam", "glòng", "glàp bâan", "kâ"],
  en: "I would like three boxes of mango sticky rice for takeaway.",
  less: 13
},
{
  th: ["ขอ", "แกงเขียวหวาน", "ไก่", "และ", "ข้าวสวย", "ครับ"],
  rom: ["kŏr", "gaeng kĭeow wăan", "gài", "láe", "kâao sŭay", "kráp"],
  en: "I would like chicken green curry and steamed rice.",
  less: 13,
  answers: [
    ["ขอ", "แกงเขียวหวาน", "ไก่", "และ", "ข้าวสวย", "ครับ"],
    ["ขอ", "ข้าวสวย", "และ", "แกงเขียวหวาน", "ไก่", "ครับ"]
  ]
},
{
  th: ["ขอ", "กาแฟ", "หนึ่ง", "แก้ว", "และ", "น้ำ", "สอง", "ขวด", "ครับ"],
  rom: ["kŏr", "gaa-fae", "nèung", "gâew", "láe", "náam", "sŏng", "kùat", "kráp"],
  en: "I would like one cup of coffee and two bottles of water.",
  less: 13,
  answers: [
    ["ขอ", "กาแฟ", "หนึ่ง", "แก้ว", "และ", "น้ำ", "สอง", "ขวด", "ครับ"],
    ["ขอ", "น้ำ", "สอง", "ขวด", "และ", "กาแฟ", "หนึ่ง", "แก้ว", "ครับ"]
  ]
},
{
  th: ["ขอ", "ผัดไทย", "และ", "ต้มยำ", "ไก่", "ครับ"],
  rom: ["kŏr", "pàt thai", "láe", "tôm yam", "gài", "kráp"],
  en: "I would like a Pad Thai and a chicken Tom Yum.",
  less: 13,
  answers: [
    ["ขอ", "ผัดไทย", "และ", "ต้มยำ", "ไก่", "ครับ"],
    ["ขอ", "ต้มยำ", "ไก่", "และ", "ผัดไทย", "ครับ"]
  ]
},
{
  th: ["เอา", "แฮมเบอร์เกอร์", "และ", "โค้ก", "ครับ"],
  rom: ["ao", "haem ber-gêr", "láe", "kóhk", "kráp"],
  en: "I want a hamburger and a coke.",
  less: 13,
  answers: [
    ["เอา", "แฮมเบอร์เกอร์", "และ", "โค้ก", "ครับ"],
    ["เอา", "โค้ก", "และ", "แฮมเบอร์เกอร์", "ครับ"]
  ]
},
{
  th: ["ขอ", "เอสเพรสโซ", "ร้อน", "ครับ"],
  rom: ["kŏr", "espresso", "rón", "kráp"],
  en: "I would like a hot espresso.",
  less: 13
},
{
  th: ["ขอ", "เอสเพรสโซ", "ร้อน", "กลับบ้าน", "ครับ"],
  rom: ["kŏr", "espresso", "rón", "glàp bâan", "kráp"],
  en: "I would like a hot espresso for takeaway.",
  less: 13
},
{
  th: ["ขอ", "คาปูชิโน่", "เย็น", "สอง", "แก้ว", "ค่ะ"],
  rom: ["kŏr", "cappuccino", "yen", "sŏng", "gâew", "kâ"],
  en: "I would like two cups of iced cappuccino.",
  less: 13
},
{
  th: ["เอา", "คาปูชิโน่", "เย็น", "สอง", "แก้ว", "กลับบ้าน", "ครับ"],
  rom: ["ao", "cappuccino", "yen", "sŏng", "gâew", "glàp bâan", "kráp"],
  en: "I want two cups of iced cappuccino for takeaway.",
  less: 13
},
{
  th: ["ขอ", "กาแฟ", "ร้อน", "หนึ่ง", "แก้ว", "ค่ะ"],
  rom: ["kŏr", "gaa-fae", "rón", "nèung", "gâew", "kâ"],
  en: "I would like one cup of hot coffee.",
  less: 13
},
{
  th: ["ผม", "แพ้", "นม", "ครับ"],
  rom: ["pŏm", "páe", "nom", "kráp"],
  en: "I'm allergic to milk.",
  less: 13,
  traps: { th: ["แพง"], rom: ["paeng"] }
},
{
  th: ["เพื่อน", "ของ", "ฉัน", "แพ้", "ถั่วลิสง", "ค่ะ"],
  rom: ["pêuan", "kŏng", "chăn", "páe", "tùa-lí-sŏng", "kâ"],
  en: "My friend is allergic to peanuts.",
  less: 13,
  traps: { th: ["แพง"], rom: ["paeng"] }
},
{
  th: ["ผม", "กิน", "เผ็ด", "ไม่", "ได้", "ขอ", "ผัดไทย", "ไม่", "เผ็ด", "ครับ"],
  rom: ["pŏm", "gin", "pèt", "mâi", "dâai", "kŏr", "pàt thai", "mâi", "pèt", "kráp"],
  en: "I can't eat spicy food. I would like a Pad Thai, not spicy.",
  less: 13
},
{
  th: ["ขอโทษ", "ครับ", "ขอ", "เมนู", "หน่อย", "ครับ"],
  rom: ["kŏr tôht", "kráp", "kŏr", "may-noo", "nòi", "kráp"],
  en: "Excuse me, may I have a menu please.",
  less: 13
},
{
  th: ["อาหาร", "ที่", "ร้าน", "นี้", "อร่อย", "และ", "ไม่", "แพง"],
  rom: ["aa-hăan", "têe", "ráan", "née", "à-ròi", "láe", "mâi", "paeng"],
  en: "The food at this restaurant is delicious and not expensive.",
  less: 13,
  answers: [
    ["อาหาร", "ที่", "ร้าน", "นี้", "อร่อย", "และ", "ไม่", "แพง"],
    ["อาหาร", "ที่", "ร้าน", "นี้", "ไม่", "แพง", "และ", "อร่อย"]
  ]
},
{
  th: ["ผม", "ชอบ", "กิน", "ผัดกะเพรา", "หมู", "มาก", "ครับ"],
  rom: ["pŏm", "chôp", "gin", "pàt gà prao", "mŏo", "mâak", "kráp"],
  en: "I really like to eat pork stir-fried basil.",
  less: 13
},
{
  th: ["คุณ", "ชอบ", "กิน", "อาหาร", "เผ็ด", "ไหม", "คะ"],
  rom: ["kun", "chôp", "gin", "aa-hăan", "pèt", "măi", "ká"],
  en: "Do you like to eat spicy food?",
  less: 13
},

// ===== LESSON 14 (Future Tense) =====
{
  // CHANGED (too easy: 5 tokens, 0 traps) — extended + traps
  th: ["พรุ่งนี้", "ผม", "จะ", "ไปเยี่ยม", "พ่อแม่", "ที่", "กรุงเทพ"],
  rom: ["prûng-née", "pŏm", "jà", "bpai yîam", "pôr mâe", "têe", "grung têp"],
  en: "Tomorrow I will visit my parents in Bangkok.",
  less: 14,
  answers: [
    ["พรุ่งนี้", "ผม", "จะ", "ไปเยี่ยม", "พ่อแม่", "ที่", "กรุงเทพ"],
    ["ผม", "จะ", "ไปเยี่ยม", "พ่อแม่", "ที่", "กรุงเทพ", "พรุ่งนี้"]
  ],
  traps: { th: ["เมื่อวาน", "กับ"], rom: ["mêua waan", "gàp"] }
},
{
  // CHANGED (too easy: 5 tokens, 0 traps) — extended + traps
  th: ["คืนนี้", "ฉัน", "จะ", "โทรหา", "แฟน", "เพราะ", "คิดถึง", "เขา", "มาก"],
  rom: ["keun née", "chăn", "jà", "toh hăa", "faen", "prór", "kít tĕung", "kăo", "mâak"],
  en: "Tonight I will call my boyfriend because I miss him a lot.",
  less: 14,
  answers: [
    ["คืนนี้", "ฉัน", "จะ", "โทรหา", "แฟน", "เพราะ", "คิดถึง", "เขา", "มาก"],
    ["ฉัน", "จะ", "โทรหา", "แฟน", "คืนนี้", "เพราะ", "คิดถึง", "เขา", "มาก"]
  ],
  traps: { th: ["เมื่อคืน", "ไหม"], rom: ["mêua keun", "măi"] }
},
{
  th: ["ปี", "หน้า", "ผม", "จะ", "ไป", "ประเทศ", "ไทย", "กับ", "ครอบครัว"],
  rom: ["bpee", "nâa", "pŏm", "jà", "bpai", "bprà-têt", "Thai", "gàp", "krôp krua"],
  en: "Next year I will go to Thailand with my family.",
  less: 14,
  answers: [
    ["ปี", "หน้า", "ผม", "จะ", "ไป", "ประเทศ", "ไทย", "กับ", "ครอบครัว"],
    ["ผม", "จะ", "ไป", "ประเทศ", "ไทย", "กับ", "ครอบครัว", "ปี", "หน้า"]
  ],
  traps: { th: ["และ"], rom: ["láe"] }  // ADDED trap
},
{
  th: ["เดือน", "หน้า", "ฉัน", "จะ", "ไปเยี่ยม", "เพื่อน", "ที่", "ญี่ปุ่น"],
  rom: ["deuan", "nâa", "chăn", "jà", "bpai yîam", "pêuan", "têe", "yêe-bpùn"],
  en: "Next month I will visit my friends in Japan.",
  less: 14,
  answers: [
    ["เดือน", "หน้า", "ฉัน", "จะ", "ไปเยี่ยม", "เพื่อน", "ที่", "ญี่ปุ่น"],
    ["ฉัน", "จะ", "ไปเยี่ยม", "เพื่อน", "ที่", "ญี่ปุ่น", "เดือน", "หน้า"]
  ],
  traps: { th: ["กับ"], rom: ["gàp"] }  // ADDED trap
},
{
  th: ["คุณ", "จะ", "ทำ", "อะไร", "คืนนี้"],
  rom: ["kun", "jà", "tam", "à-rai", "keun née"],
  en: "What will you do tonight?",
  less: 14,
  answers: [
    ["คุณ", "จะ", "ทำ", "อะไร", "คืนนี้"],
    ["คืนนี้", "คุณ", "จะ", "ทำ", "อะไร"]
  ],
  traps: { th: ["เมื่อคืน", "เมื่อวาน"], rom: ["mêua keun", "mêua waan"] }  // ADDED traps (too easy)
},
{
  th: ["คุณ", "จะ", "ไป", "พัทยา", "กับ", "ใคร"],
  rom: ["kun", "jà", "bpai", "pát-tá-yaa", "gàp", "krai"],
  en: "Who will you go to Pattaya with?",
  less: 14,
  traps: { th: ["และ"], rom: ["láe"] }  // ADDED trap
},
{
  th: ["ฉัน", "จะ", "ไป", "ประเทศ", "ฝรั่งเศส", "คนเดียว"],
  rom: ["chăn", "jà", "bpai", "bprà-têt", "fà-ràng-sèt", "kon dieow"],
  en: "I will go to France alone.",
  less: 14,
  traps: { th: ["กับ", "คน"], rom: ["gàp", "kon"] }  // ADDED traps
},
{
  th: ["เสาร์อาทิตย์", "นี้", "คุณ", "จะ", "ทำ", "อะไร"],
  rom: ["săo aa-tít", "née", "kun", "jà", "tam", "à-rai"],
  en: "What will you do this weekend?",
  less: 14,
  answers: [  // ADDED answers
    ["เสาร์อาทิตย์", "นี้", "คุณ", "จะ", "ทำ", "อะไร"],
    ["คุณ", "จะ", "ทำ", "อะไร", "เสาร์อาทิตย์", "นี้"]
  ],
  traps: { th: ["นี่"], rom: ["nêe"] }  // ADDED trap
},
{
  th: ["ผม", "จะ", "ไป", "พักผ่อน", "และ", "กิน", "อาหารทะเล"],
  rom: ["pŏm", "jà", "bpai", "pák pòn", "láe", "gin", "aa hăan tá-lay"],
  en: "I will go relax and eat seafood.",
  less: 14,
  answers: [
    ["ผม", "จะ", "ไป", "พักผ่อน", "และ", "กิน", "อาหารทะเล"],
    ["ผม", "จะ", "กิน", "อาหารทะเล", "และ", "ไป", "พักผ่อน"]
  ],
  traps: { th: ["แต่"], rom: ["dtàe"] }  // ADDED trap
},
{
  th: ["อาทิตย์", "หน้า", "ฉัน", "จะ", "ไป", "ภูเก็ต", "กับ", "แฟน"],
  rom: ["aa-tít", "nâa", "chăn", "jà", "bpai", "poo-gèt", "gàp", "faen"],
  en: "Next week I will go to Phuket with my boyfriend.",
  less: 14,
  answers: [
    ["อาทิตย์", "หน้า", "ฉัน", "จะ", "ไป", "ภูเก็ต", "กับ", "แฟน"],
    ["ฉัน", "จะ", "ไป", "ภูเก็ต", "กับ", "แฟน", "อาทิตย์", "หน้า"]
  ],
  traps: { th: ["และ"], rom: ["láe"] }  // ADDED trap
},
{
  th: ["ผม", "จะ", "ไป", "เจอ", "เพื่อน", "และ", "ดื่ม", "เบียร์"],
  rom: ["pŏm", "jà", "bpai", "jer", "pêuan", "láe", "dèum", "bia"],
  en: "I will go meet my friends and drink beer.",
  less: 14,
  traps: { th: ["กับ"], rom: ["gàp"] }  // ADDED trap
},
{
  // CHANGED (6 tokens, 0 traps) — now also practises คัน + ใหม่
  th: ["พรุ่งนี้", "ผม", "จะ", "ไป", "ซื้อ", "รถ", "คัน", "ใหม่", "กับ", "พ่อ"],
  rom: ["prûng-née", "pŏm", "jà", "bpai", "séu", "rót", "kan", "mài", "gàp", "pôr"],
  en: "Tomorrow I will go buy a new car with my dad.",
  less: 14,
  answers: [
    ["พรุ่งนี้", "ผม", "จะ", "ไป", "ซื้อ", "รถ", "คัน", "ใหม่", "กับ", "พ่อ"],
    ["ผม", "จะ", "ไป", "ซื้อ", "รถ", "คัน", "ใหม่", "กับ", "พ่อ", "พรุ่งนี้"]
  ],
  traps: { th: ["หลัง", "เมื่อวาน"], rom: ["lăng", "mêua waan"] }
},
{
  th: ["ฉัน", "จะ", "ไม่", "ไป", "ปาร์ตี้", "คืนนี้"],
  rom: ["chăn", "jà", "mâi", "bpai", "bpaa-dtêe", "keun née"],
  en: "I won't go to the party tonight.",
  less: 14,
  answers: [
    ["ฉัน", "จะ", "ไม่", "ไป", "ปาร์ตี้", "คืนนี้"],
    ["คืนนี้", "ฉัน", "จะ", "ไม่", "ไป", "ปาร์ตี้"]
  ],
  traps: { th: ["เมื่อคืน", "เมื่อวาน"], rom: ["mêua keun", "mêua waan"] }  // ADDED traps
},
{
  th: ["ผม", "จะ", "ส่งข้อความหา", "คุณ", "พรุ่งนี้", "เช้า"],
  rom: ["pŏm", "jà", "sòng kôr kwaam hăa", "kun", "prûng-née", "cháo"],
  en: "I will text you tomorrow morning.",
  less: 14,
  answers: [
    ["ผม", "จะ", "ส่งข้อความหา", "คุณ", "พรุ่งนี้", "เช้า"],
    ["พรุ่งนี้", "เช้า", "ผม", "จะ", "ส่งข้อความหา", "คุณ"]
  ],
  traps: { th: ["เมื่อวาน", "เมื่อคืน"], rom: ["mêua waan", "mêua keun"] }  // ADDED traps
},
{
  // CHANGED (6 tokens, 0 traps) — extended + traps
  th: ["คืนนี้", "เพื่อน", "ของ", "ผม", "จะ", "มา", "ปาร์ตี้", "ที่", "บ้าน"],
  rom: ["keun née", "pêuan", "kŏng", "pŏm", "jà", "maa", "bpaa-dtêe", "têe", "bâan"],
  en: "Tonight my friends will come to a party at my house.",
  less: 14,
  answers: [
    ["คืนนี้", "เพื่อน", "ของ", "ผม", "จะ", "มา", "ปาร์ตี้", "ที่", "บ้าน"],
    ["เพื่อน", "ของ", "ผม", "จะ", "มา", "ปาร์ตี้", "ที่", "บ้าน", "คืนนี้"]
  ],
  traps: { th: ["เมื่อคืน", "และ"], rom: ["mêua keun", "láe"] }
},
{
  th: ["แฟน", "ของ", "ผม", "จะ", "มาเยี่ยม", "ผม", "พรุ่งนี้"],
  rom: ["faen", "kŏng", "pŏm", "jà", "maa yîam", "pŏm", "prûng-née"],
  en: "My girlfriend will come visit me tomorrow.",
  less: 14,
  answers: [
    ["แฟน", "ของ", "ผม", "จะ", "มาเยี่ยม", "ผม", "พรุ่งนี้"],
    ["พรุ่งนี้", "แฟน", "ของ", "ผม", "จะ", "มาเยี่ยม", "ผม"]
  ],
  traps: { th: ["ไปเยี่ยม", "เมื่อวาน"], rom: ["bpai yîam", "mêua waan"] }  // ADDED traps
},
{
  th: ["วันศุกร์", "หน้า", "ผม", "จะ", "ไป", "เจอ", "เพื่อน"],
  rom: ["wan sùk", "nâa", "pŏm", "jà", "bpai", "jer", "pêuan"],
  en: "Next Friday I will meet my friends.",
  less: 14,
  answers: [
    ["วันศุกร์", "หน้า", "ผม", "จะ", "ไป", "เจอ", "เพื่อน"],
    ["ผม", "จะ", "ไป", "เจอ", "เพื่อน", "วันศุกร์", "หน้า"]
  ]
},
{
  th: ["วันอาทิตย์", "ฉัน", "จะ", "พักผ่อน", "อยู่", "บ้าน"],
  rom: ["wan aa-tít", "chăn", "jà", "pák pòn", "yòo", "bâan"],
  en: "On Sunday I will relax at home.",
  less: 14,
  answers: [
    ["วันอาทิตย์", "ฉัน", "จะ", "พักผ่อน", "อยู่", "บ้าน"],
    ["ฉัน", "จะ", "พักผ่อน", "อยู่", "บ้าน", "วันอาทิตย์"]
  ]
},
{
  // CHANGED: วิ่ง (run) is not in the vocab list — replaced. Keep the original if วิ่ง is taught.
  th: ["พรุ่งนี้", "เช้า", "ผม", "จะ", "ไป", "วัด", "กับ", "แม่"],
  rom: ["prûng-née", "cháo", "pŏm", "jà", "bpai", "wát", "gàp", "mâe"],
  en: "Tomorrow morning I will go to the temple with my mom.",
  less: 14,
  answers: [
    ["พรุ่งนี้", "เช้า", "ผม", "จะ", "ไป", "วัด", "กับ", "แม่"],
    ["ผม", "จะ", "ไป", "วัด", "กับ", "แม่", "พรุ่งนี้", "เช้า"]
  ],
  traps: { th: ["วัน", "และ"], rom: ["wan", "láe"] }
},
{
  th: ["คืนพรุ่งนี้", "ฉัน", "จะ", "ออกกำลังกาย", "ที่", "บ้าน"],
  rom: ["keun prûng-née", "chăn", "jà", "òk gam-lang gaai", "têe", "bâan"],
  en: "Tomorrow night I will exercise at home.",
  less: 14,
  answers: [
    ["คืนพรุ่งนี้", "ฉัน", "จะ", "ออกกำลังกาย", "ที่", "บ้าน"],
    ["ฉัน", "จะ", "ออกกำลังกาย", "ที่", "บ้าน", "คืนพรุ่งนี้"]
  ],
  traps: { th: ["เมื่อคืน"], rom: ["mêua keun"] }  // ADDED trap
},
{
  th: ["ผู้หญิง", "สวย", "คน", "นั้น", "คือ", "ใคร"],
  rom: ["pôo yĭng", "sŭay", "kon", "nán", "keu", "krai"],
  en: "Who is that beautiful woman?",
  less: 14,
  traps: { th: ["นั่น", "ตัว"], rom: ["nân", "dtua"] }  // ADDED traps
},
{
  // CHANGED (6 tokens, 0 traps; only made sense right after the sentence above)
  th: ["ผู้หญิง", "คน", "นั้น", "คือ", "แฟน", "ใหม่", "ของ", "ปีเตอร์"],
  rom: ["pôo yĭng", "kon", "nán", "keu", "faen", "mài", "kŏng", "Peter"],
  en: "That woman is Peter's new girlfriend.",
  less: 14,
  traps: { th: ["นั่น", "ตัว"], rom: ["nân", "dtua"] }
},
{
  // CHANGED (too easy: 5 tokens, 0 traps) — merged with "That man is very annoying."
  th: ["ผู้ชาย", "คน", "นั้น", "หล่อ", "มาก", "แต่", "น่ารำคาญ"],
  rom: ["pôo chaai", "kon", "nán", "lòr", "mâak", "dtàe", "nâa ram-kaan"],
  en: "That man is very handsome, but annoying.",
  less: 14,
  traps: { th: ["นั่น", "ตัว"], rom: ["nân", "dtua"] }
},
{
  // CHANGED (too easy: 5 tokens, 0 traps)
  th: ["รถ", "คัน", "นี้", "สวย", "แต่", "แพง", "เกินไป"],
  rom: ["rót", "kan", "née", "sŭay", "dtàe", "paeng", "gern bpai"],
  en: "This car is beautiful, but too expensive.",
  less: 14,
  traps: { th: ["ตัว", "นี่"], rom: ["dtua", "nêe"] }
},
{
  th: ["เด็ก", "คน", "นั้น", "เสียงดัง", "และ", "น่ารำคาญ", "มาก"],
  rom: ["dèk", "kon", "nán", "sĭang dang", "láe", "nâa ram-kaan", "mâak"],
  en: "That kid is very loud and annoying.",
  less: 14,
  answers: [  // ADDED answers
    ["เด็ก", "คน", "นั้น", "เสียงดัง", "และ", "น่ารำคาญ", "มาก"],
    ["เด็ก", "คน", "นั้น", "น่ารำคาญ", "และ", "เสียงดัง", "มาก"]
  ],
  traps: { th: ["นั่น", "ตัว"], rom: ["nân", "dtua"] }  // ADDED traps
},
{
  // CHANGED (5 tokens, 0 traps; its content moved into the handsome/annoying sentence above)
  th: ["บ้าน", "หลัง", "นั้น", "ใหญ่", "กว่า", "บ้าน", "หลัง", "นี้"],
  rom: ["bâan", "lăng", "nán", "yài", "gwàa", "bâan", "lăng", "née"],
  en: "That house is bigger than this house.",
  less: 14,
  traps: { th: ["คัน", "นั่น"], rom: ["kan", "nân"] }
},
{
  th: ["ผม", "เรียน", "ภาษา", "ไทย", "เพราะ", "ปี", "หน้า", "ผม", "จะ", "ไป", "ประเทศ", "ไทย"],
  rom: ["pŏm", "rian", "paa-săa", "Thai", "prór", "bpee", "nâa", "pŏm", "jà", "bpai", "bprà-têt", "Thai"],
  en: "I study Thai because next year I will go to Thailand.",
  less: 14,
  answers: [  // ADDED answers
    ["ผม", "เรียน", "ภาษา", "ไทย", "เพราะ", "ปี", "หน้า", "ผม", "จะ", "ไป", "ประเทศ", "ไทย"],
    ["ผม", "เรียน", "ภาษา", "ไทย", "เพราะ", "ผม", "จะ", "ไป", "ประเทศ", "ไทย", "ปี", "หน้า"]
  ]
},
{
  th: ["คืนนี้", "ฉัน", "จะ", "เรียน", "ภาษา", "อังกฤษ", "และ", "ดูหนัง"],
  rom: ["keun née", "chăn", "jà", "rian", "paa-săa", "ang-grìt", "láe", "doo năng"],
  en: "Tonight I will study English and watch a movie.",
  less: 14,
  answers: [
    ["คืนนี้", "ฉัน", "จะ", "เรียน", "ภาษา", "อังกฤษ", "และ", "ดูหนัง"],
    ["ฉัน", "จะ", "เรียน", "ภาษา", "อังกฤษ", "และ", "ดูหนัง", "คืนนี้"],
    ["คืนนี้", "ฉัน", "จะ", "ดูหนัง", "และ", "เรียน", "ภาษา", "อังกฤษ"],
    ["ฉัน", "จะ", "ดูหนัง", "และ", "เรียน", "ภาษา", "อังกฤษ", "คืนนี้"]
  ],
  traps: { th: ["เมื่อคืน"], rom: ["mêua keun"] }  // ADDED trap
},
{
  th: ["เรา", "จะ", "ดื่ม", "เบียร์", "และ", "ดู", "ฟุตบอล"],
  rom: ["rao", "jà", "dèum", "bia", "láe", "doo", "fút bon"],
  en: "We will drink beer and watch football.",
  less: 14,
  answers: [
    ["เรา", "จะ", "ดื่ม", "เบียร์", "และ", "ดู", "ฟุตบอล"],
    ["เรา", "จะ", "ดู", "ฟุตบอล", "และ", "ดื่ม", "เบียร์"]
  ]
},
{
  th: ["คืนนี้", "ผม", "จะ", "ไม่", "โทรหา", "เขา", "แต่", "จะ", "ส่งข้อความหา", "เขา"],
  rom: ["keun née", "pŏm", "jà", "mâi", "toh hăa", "kăo", "dtàe", "jà", "sòng kôr kwaam hăa", "kăo"],  // FIXED romanization consistency
  en: "Tonight I will not call him/her, but I will text him/her.",
  less: 14,
  answers: [
    ["คืนนี้", "ผม", "จะ", "ไม่", "โทรหา", "เขา", "แต่", "จะ", "ส่งข้อความหา", "เขา"],
    ["ผม", "จะ", "ไม่", "โทรหา", "เขา", "แต่", "จะ", "ส่งข้อความหา", "เขา", "คืนนี้"]
  ]
},
{
  // CHANGED: ไปดูคอนเสิร์ต is more natural than ไปคอนเสิร์ต
  th: ["เสาร์", "นี้", "ฉัน", "จะ", "ไป", "ดู", "คอนเสิร์ต", "กับ", "แฟน"],
  rom: ["săo", "née", "chăn", "jà", "bpai", "doo", "kon-sèrt", "gàp", "faen"],
  en: "This Saturday I will go to a concert with my boyfriend.",
  less: 14,
  answers: [
    ["เสาร์", "นี้", "ฉัน", "จะ", "ไป", "ดู", "คอนเสิร์ต", "กับ", "แฟน"],
    ["ฉัน", "จะ", "ไป", "ดู", "คอนเสิร์ต", "กับ", "แฟน", "เสาร์", "นี้"]
  ],
  traps: { th: ["นี่"], rom: ["nêe"] }
},
{
  th: ["เดือน", "หน้า", "ผม", "จะ", "ไป", "อิตาลี", "กับ", "ภรรยา"],
  rom: ["deuan", "nâa", "pŏm", "jà", "bpai", "ì-dtaa-lee", "gàp", "pan-rá-yaa"],
  en: "Next month I will go to Italy with my wife.",
  less: 14,
  answers: [
    ["เดือน", "หน้า", "ผม", "จะ", "ไป", "อิตาลี", "กับ", "ภรรยา"],
    ["ผม", "จะ", "ไป", "อิตาลี", "กับ", "ภรรยา", "เดือน", "หน้า"]
  ]
},
{
  th: ["พรุ่งนี้", "เช้า", "ผม", "จะ", "โทรหา", "แม่", "ของ", "ผม"],
  rom: ["prûng-née", "cháo", "pŏm", "jà", "toh hăa", "mâe", "kŏng", "pŏm"],
  en: "Tomorrow morning I will call my mother.",
  less: 14,
  answers: [
    ["พรุ่งนี้", "เช้า", "ผม", "จะ", "โทรหา", "แม่", "ของ", "ผม"],
    ["ผม", "จะ", "โทรหา", "แม่", "ของ", "ผม", "พรุ่งนี้", "เช้า"]
  ]
},
{
  th: ["ผม", "จะ", "ไม่", "ทำงาน", "วันเสาร์", "และ", "วันอาทิตย์"],
  rom: ["pŏm", "jà", "mâi", "tam ngaan", "wan săo", "láe", "wan aa-tít"],
  en: "I won't work on Saturday and Sunday.",
  less: 14,
  answers: [
    ["ผม", "จะ", "ไม่", "ทำงาน", "วันเสาร์", "และ", "วันอาทิตย์"],
    ["ผม", "จะ", "ไม่", "ทำงาน", "วันอาทิตย์", "และ", "วันเสาร์"],
    ["วันเสาร์", "และ", "วันอาทิตย์", "ผม", "จะ", "ไม่", "ทำงาน"],   // ADDED
    ["วันอาทิตย์", "และ", "วันเสาร์", "ผม", "จะ", "ไม่", "ทำงาน"]    // ADDED
  ],
  traps: { th: ["วันพุธ"], rom: ["wan pút"] }
},
{
  th: ["เดือน", "หน้า", "พ่อ", "ของ", "ผม", "จะ", "ไป", "ญี่ปุ่น", "คนเดียว"],
  rom: ["deuan", "nâa", "pôr", "kŏng", "pŏm", "jà", "bpai", "yêe-bpùn", "kon dieow"],
  en: "Next month my father will go to Japan alone.",
  less: 14,
  answers: [
    ["เดือน", "หน้า", "พ่อ", "ของ", "ผม", "จะ", "ไป", "ญี่ปุ่น", "คนเดียว"],
    ["พ่อ", "ของ", "ผม", "จะ", "ไป", "ญี่ปุ่น", "คนเดียว", "เดือน", "หน้า"]
  ],
  traps: { th: ["กับ", "คน"], rom: ["gàp", "kon"] }  // FIXED trailing space in "gàp "
},
{
  th: ["วันจันทร์", "หน้า", "ฉัน", "จะ", "มี", "นัด", "สำคัญ"],
  rom: ["wan jan", "nâa", "chăn", "jà", "mee", "nát", "săm-kan"],
  en: "Next Monday I will have an important appointment.",
  less: 14,
  answers: [
    ["วันจันทร์", "หน้า", "ฉัน", "จะ", "มี", "นัด", "สำคัญ"],
    ["ฉัน", "จะ", "มี", "นัด", "สำคัญ", "วันจันทร์", "หน้า"]
  ]
},
{
  th: ["ผม", "จะ", "เรียน", "ภาษา", "ไทย", "อยู่", "บ้าน", "คืนนี้"],
  rom: ["pŏm", "jà", "rian", "paa-săa", "Thai", "yòo", "bâan", "keun née"],
  en: "I will study Thai at home tonight.",
  less: 14,
  answers: [
    ["ผม", "จะ", "เรียน", "ภาษา", "ไทย", "อยู่", "บ้าน", "คืนนี้"],
    ["คืนนี้", "ผม", "จะ", "เรียน", "ภาษา", "ไทย", "อยู่", "บ้าน"]
  ]
},
{
  // CHANGED: near-duplicate of a Lesson 10 sentence (go to the market + buy fruit tomorrow)
  th: ["ปี", "หน้า", "พี่สาว", "ของ", "ฉัน", "จะ", "ไป", "เรียน", "ที่", "อเมริกา"],
  rom: ["bpee", "nâa", "pêe săao", "kŏng", "chăn", "jà", "bpai", "rian", "têe", "à-may-rí-gaa"],
  en: "Next year my older sister will go to study in America.",
  less: 14,
  answers: [
    ["ปี", "หน้า", "พี่สาว", "ของ", "ฉัน", "จะ", "ไป", "เรียน", "ที่", "อเมริกา"],
    ["พี่สาว", "ของ", "ฉัน", "จะ", "ไป", "เรียน", "ที่", "อเมริกา", "ปี", "หน้า"]
  ],
  traps: { th: ["น้องสาว", "กับ"], rom: ["nóng săao", "gàp"] }
},
{
  th: ["เขา", "จะ", "ไม่", "มา", "เพราะ", "เขา", "ไม่", "สบาย"],
  rom: ["kăo", "jà", "mâi", "maa", "prór", "kăo", "mâi", "sà-baai"],
  en: "He/she won't come because he/she is not feeling well.",
  less: 14
},
{
  th: ["คืนนี้", "คุณ", "จะ", "ไป", "เจอ", "เพื่อน", "ที่ไหน"],
  rom: ["keun née", "kun", "jà", "bpai", "jer", "pêuan", "têe năi"],
  en: "Where will you meet your friends tonight?",
  less: 14,
  answers: [
    ["คืนนี้", "คุณ", "จะ", "ไป", "เจอ", "เพื่อน", "ที่ไหน"],
    ["คุณ", "จะ", "ไป", "เจอ", "เพื่อน", "ที่ไหน", "คืนนี้"]
  ]
},
{
  // CHANGED: 6th "[time] จะไป [place] กับ [person]" sentence — replaced with a duration sentence
  th: ["วันศุกร์", "นี้", "ผม", "จะ", "ไป", "กรุงเทพ", "สาม", "วัน"],
  rom: ["wan sùk", "née", "pŏm", "jà", "bpai", "grung têp", "săam", "wan"],
  en: "This Friday I will go to Bangkok for three days.",
  less: 14,
  traps: { th: ["นี่", "ตัว"], rom: ["nêe", "dtua"] }
},
{
  // CHANGED (too easy: 5 tokens, 0 traps, no context)
  th: ["คืนนี้", "คุณ", "จะ", "ไป", "กิน", "ข้าว", "กับ", "ใคร"],
  rom: ["keun née", "kun", "jà", "bpai", "gin", "kâao", "gàp", "krai"],
  en: "Who will you have dinner with tonight?",
  less: 14,
  answers: [
    ["คืนนี้", "คุณ", "จะ", "ไป", "กิน", "ข้าว", "กับ", "ใคร"],
    ["คุณ", "จะ", "ไป", "กิน", "ข้าว", "กับ", "ใคร", "คืนนี้"]
  ],
  traps: { th: ["และ", "เมื่อคืน"], rom: ["láe", "mêua keun"] }
},
{
  // CHANGED: ไปเจอหมอ is not idiomatic (ไปหาหมอ is, but หา is only taught in L15)
  th: ["พรุ่งนี้", "เช้า", "ผม", "จะ", "ไป", "โรงพยาบาล", "กับ", "แม่"],
  rom: ["prûng-née", "cháo", "pŏm", "jà", "bpai", "rohng pá-yaa-baan", "gàp", "mâe"],
  en: "Tomorrow morning I will go to the hospital with my mom.",
  less: 14,
  answers: [
    ["พรุ่งนี้", "เช้า", "ผม", "จะ", "ไป", "โรงพยาบาล", "กับ", "แม่"],
    ["ผม", "จะ", "ไป", "โรงพยาบาล", "กับ", "แม่", "พรุ่งนี้", "เช้า"]
  ],
  traps: { th: ["และ", "เมื่อวาน"], rom: ["láe", "mêua waan"] }
},
{
  th: ["เธอ", "จะ", "มาเยี่ยม", "ผม", "อาทิตย์", "หน้า", "ใช่ไหม"],
  rom: ["ter", "jà", "maa yîam", "pŏm", "aa-tít", "nâa", "châi măi"],
  en: "You will come visit me next week, right? (informal)",
  less: 14,
  answers: [  // ADDED answers
    ["เธอ", "จะ", "มาเยี่ยม", "ผม", "อาทิตย์", "หน้า", "ใช่ไหม"],
    ["อาทิตย์", "หน้า", "เธอ", "จะ", "มาเยี่ยม", "ผม", "ใช่ไหม"]
  ],
  traps: { th: ["ไปเยี่ยม"], rom: ["bpai yîam"] }  // ADDED trap
},
{
  // CHANGED: "จะไปทะเลและจะสนุกมาก" sounds translated from English
  th: ["วันเสาร์", "พวกเขา", "จะ", "ไป", "ทะเล", "แต่", "วันอาทิตย์", "จะ", "พักผ่อน", "อยู่", "บ้าน"],
  rom: ["wan săo", "pûak kăo", "jà", "bpai", "tá-lay", "dtàe", "wan aa-tít", "jà", "pák pòn", "yòo", "bâan"],
  en: "On Saturday they will go to the sea, but on Sunday they will rest at home.",
  less: 14
},
{
  // CHANGED (too easy: 5 tokens, 0 traps) — merged with "เที่ยวให้สนุกนะ" (4 tokens), which is removed below
  th: ["เที่ยว", "ให้", "สนุก", "นะ", "ผม", "จะ", "คิดถึง", "คุณ", "มาก"],
  rom: ["tîeow", "hâi", "sà-nùk", "ná", "pŏm", "jà", "kít tĕung", "kun", "mâak"],
  en: "Have a nice trip. I will miss you a lot.",
  less: 14,
  answers: [
    ["เที่ยว", "ให้", "สนุก", "นะ", "ผม", "จะ", "คิดถึง", "คุณ", "มาก"],
    ["ผม", "จะ", "คิดถึง", "คุณ", "มาก", "เที่ยว", "ให้", "สนุก", "นะ"]
  ],
  traps: { th: ["ไหม"], rom: ["măi"] }
},
{
  // CHANGED (too easy: 5 tokens, 0 traps) — extended with context
  th: ["เดือน", "หน้า", "ผม", "จะ", "ไป", "ญี่ปุ่น", "คุณ", "จะ", "คิดถึง", "ผม", "รึเปล่า"],
  rom: ["deuan", "nâa", "pŏm", "jà", "bpai", "yêe-bpùn", "kun", "jà", "kít tĕung", "pŏm", "réu bplào"],
  en: "Next month I'm going to Japan. Will you miss me?",
  less: 14,
  answers: [
    ["เดือน", "หน้า", "ผม", "จะ", "ไป", "ญี่ปุ่น", "คุณ", "จะ", "คิดถึง", "ผม", "รึเปล่า"],
    ["ผม", "จะ", "ไป", "ญี่ปุ่น", "เดือน", "หน้า", "คุณ", "จะ", "คิดถึง", "ผม", "รึเปล่า"]
  ]
},
{
  th: ["คืนนี้", "เรา", "จะ", "ดื่ม", "เบียร์", "สาม", "ขวด"],
  rom: ["keun née", "rao", "jà", "dèum", "bia", "săam", "kùat"],
  en: "Tonight we will drink three bottles of beer.",
  less: 14,
  answers: [
    ["คืนนี้", "เรา", "จะ", "ดื่ม", "เบียร์", "สาม", "ขวด"],
    ["เรา", "จะ", "ดื่ม", "เบียร์", "สาม", "ขวด", "คืนนี้"]
  ],
  traps: { th: ["จาน", "ชาม"], rom: ["jaan", "chaam"] }  // ADDED traps (not แก้ว — "three glasses of beer" is also valid Thai)
},
{
  th: ["พรุ่งนี้", "คุณ", "จะ", "ซื้อ", "มะม่วง", "กี่", "ถุง"],
  rom: ["prûng-née", "kun", "jà", "séu", "má-mûang", "gèe", "tŭng"],
  en: "How many bags of mangoes will you buy tomorrow?",
  less: 14,
  answers: [
    ["พรุ่งนี้", "คุณ", "จะ", "ซื้อ", "มะม่วง", "กี่", "ถุง"],
    ["คุณ", "จะ", "ซื้อ", "มะม่วง", "กี่", "ถุง", "พรุ่งนี้"]
  ],
  traps: { th: ["เท่าไหร่", "ตัว"], rom: ["tâo rài", "dtua"] }  // ADDED traps
},
{
  // FIXED: ทำ + งาน were two tokens here but ทำงาน is one token everywhere else
  th: ["วันอังคาร", "ผม", "จะ", "ไม่", "ไป", "ทำงาน", "เพราะ", "ผม", "ไม่มี", "รถ"],
  rom: ["wan ang-kaan", "pŏm", "jà", "mâi", "bpai", "tam ngaan", "prór", "pŏm", "mâi mee", "rót"],
  en: "On Tuesday I won't go to work because I don't have a car.",
  less: 14,
  answers: [  // ADDED answers
    ["วันอังคาร", "ผม", "จะ", "ไม่", "ไป", "ทำงาน", "เพราะ", "ผม", "ไม่มี", "รถ"],
    ["ผม", "จะ", "ไม่", "ไป", "ทำงาน", "วันอังคาร", "เพราะ", "ผม", "ไม่มี", "รถ"]
  ]
},
{
  // CHANGED: added ของ — "เพราะของถูกกว่า" (because things are cheaper) is the natural phrasing
  th: ["วันพุธ", "เรา", "จะ", "ไป", "ตลาด", "ใหม่", "เพราะ", "ของ", "ถูก", "กว่า"],
  rom: ["wan pút", "rao", "jà", "bpai", "dtà-làat", "mài", "prór", "kŏng", "tòok", "gwàa"],
  en: "On Wednesday we will go to the new market because things are cheaper.",
  less: 14,
  answers: [
    ["วันพุธ", "เรา", "จะ", "ไป", "ตลาด", "ใหม่", "เพราะ", "ของ", "ถูก", "กว่า"],
    ["เรา", "จะ", "ไป", "ตลาด", "ใหม่", "วันพุธ", "เพราะ", "ของ", "ถูก", "กว่า"]
  ]
},
{
  th: ["ปี", "หน้า", "พวกเขา", "จะ", "มี", "บ้าน", "หลัง", "ใหม่"],
  rom: ["bpee", "nâa", "pûak kăo", "jà", "mee", "bâan", "lăng", "mài"],
  en: "Next year they will have a new house.",
  less: 14,
  answers: [  // ADDED answers
    ["ปี", "หน้า", "พวกเขา", "จะ", "มี", "บ้าน", "หลัง", "ใหม่"],
    ["พวกเขา", "จะ", "มี", "บ้าน", "หลัง", "ใหม่", "ปี", "หน้า"]
  ],
  traps: { th: ["คัน", "ตัว"], rom: ["kan", "dtua"] }  // ADDED traps
},
{
  // CHANGED: "...จะไป และผมก็จะไป" is unnatural (translated "and"); Thai says ผมก็จะไปเหมือนกัน
  th: ["พรุ่งนี้", "เพื่อน", "ของ", "ผม", "จะ", "ไป", "ทะเล", "ผม", "ก็", "จะ", "ไป", "เหมือนกัน"],
  rom: ["prûng-née", "pêuan", "kŏng", "pŏm", "jà", "bpai", "tá-lay", "pŏm", "gôr", "jà", "bpai", "mĕuan gan"],
  en: "Tomorrow my friend will go to the sea. I will go too.",
  less: 14,
  answers: [
    ["พรุ่งนี้", "เพื่อน", "ของ", "ผม", "จะ", "ไป", "ทะเล", "ผม", "ก็", "จะ", "ไป", "เหมือนกัน"],
    ["เพื่อน", "ของ", "ผม", "จะ", "ไป", "ทะเล", "พรุ่งนี้", "ผม", "ก็", "จะ", "ไป", "เหมือนกัน"]
  ],
  traps: { th: ["และ"], rom: ["láe"] }
},
{
  th: ["วันพฤหัสบดี", "ฉัน", "จะ", "เจอ", "พี่สาว", "ใน", "เมือง"],
  rom: ["wan pá-réu-hàt-sà-bor-dee", "chăn", "jà", "jer", "pêe săao", "nai", "meuang"],
  en: "On Thursday I will meet my elder sister in the city.",
  less: 14,
  answers: [  // ADDED answers
    ["วันพฤหัสบดี", "ฉัน", "จะ", "เจอ", "พี่สาว", "ใน", "เมือง"],
    ["ฉัน", "จะ", "เจอ", "พี่สาว", "ใน", "เมือง", "วันพฤหัสบดี"]
  ]
},
{
  // FIXED: โทร + หา were two tokens here but โทรหา is one token everywhere else
  th: ["ผม", "จะ", "ไม่", "ลืม", "โทรหา", "เขา", "วันนี้"],
  rom: ["pŏm", "jà", "mâi", "leum", "toh hăa", "kăo", "wan née"],
  en: "I won't forget to call him today.",
  less: 14,
  answers: [  // ADDED answers
    ["ผม", "จะ", "ไม่", "ลืม", "โทรหา", "เขา", "วันนี้"],
    ["วันนี้", "ผม", "จะ", "ไม่", "ลืม", "โทรหา", "เขา"]
  ],
  traps: { th: ["เมื่อวาน"], rom: ["mêua waan"] }  // ADDED trap
},
{
  // CHANGED: เบื่อ (bored) is an odd reason to skip something; เหนื่อย (tired, L7) is natural
  th: ["เธอ", "จะ", "ไม่", "ไป", "เพราะ", "เธอ", "เหนื่อย"],
  rom: ["ter", "jà", "mâi", "bpai", "prór", "ter", "nèuay"],
  en: "She won't go because she's tired.",
  less: 14
},
{
  th: ["เรา", "จะ", "ไม่", "ซื้อ", "รถ", "คัน", "นั้น", "เพราะ", "ไม่มี", "ตังค์"],
  rom: ["rao", "jà", "mâi", "séu", "rót", "kan", "nán", "prór", "mâi mee", "dtang"],
  en: "We won't buy that car because we don't have money.",
  less: 14,
  traps: { th: ["นั่น", "ตัว"], rom: ["nân", "dtua"] }  // ADDED traps
},
{
  th: ["พรุ่งนี้", "คุณ", "จะ", "ไป", "สนามบิน", "รึเปล่า"],
  rom: ["prûng-née", "kun", "jà", "bpai", "sà-năam bin", "réu bplào"],
  en: "Will you go to the airport tomorrow or not?",
  less: 14,
  answers: [  // ADDED answers
    ["พรุ่งนี้", "คุณ", "จะ", "ไป", "สนามบิน", "รึเปล่า"],
    ["คุณ", "จะ", "ไป", "สนามบิน", "พรุ่งนี้", "รึเปล่า"]
  ]
},
// REMOVED: ["เที่ยว","ให้","สนุก","นะ"] (4 tokens) — merged into "Have a nice trip. I will miss you a lot."
{
  th: ["คืนนี้", "เรา", "จะ", "กิน", "ข้าว", "ที่", "บ้าน", "ของ", "พ่อแม่"],
  rom: ["keun née", "rao", "jà", "gin", "kâao", "têe", "bâan", "kŏng", "pôr mâe"],
  en: "Tonight we will eat at my parents' house.",
  less: 14,
  answers: [
    ["คืนนี้", "เรา", "จะ", "กิน", "ข้าว", "ที่", "บ้าน", "ของ", "พ่อแม่"],
    ["เรา", "จะ", "กิน", "ข้าว", "ที่", "บ้าน", "ของ", "พ่อแม่", "คืนนี้"]
  ]
},
{
  th: ["อาทิตย์", "หน้า", "พวกเขา", "จะ", "ไป", "ดู", "ช้าง", "ที่", "เชียงใหม่"],
  rom: ["aa-tít", "nâa", "pûak kăo", "jà", "bpai", "doo", "cháng", "têe", "chiang-mài"],  // FIXED "Chiang Mai" -> chiang-mài (as in Lesson 16)
  en: "Next week they will go see elephants in Chiang Mai.",
  less: 14,
  answers: [
    ["อาทิตย์", "หน้า", "พวกเขา", "จะ", "ไป", "ดู", "ช้าง", "ที่", "เชียงใหม่"],
    ["พวกเขา", "จะ", "ไป", "ดู", "ช้าง", "ที่", "เชียงใหม่", "อาทิตย์", "หน้า"]
  ]
},

// ===== LESSON 15 (Wanting) =====
{
  th: ["ผม", "อยาก", "เรียน", "ภาษา", "ไทย"],
  rom: ["pŏm", "yàak", "rian", "paa-săa", "Thai"],
  en: "I want to learn Thai.",
  less: 15,
  traps: { th: ["อยากได้", "ต้อง"], rom: ["yàak dâai", "dtông"] }  // FIXED trap: ต้องการ + verb is valid (formal "want to")
},
{
  th: ["ฉัน", "อยาก", "กิน", "อาหารญี่ปุ่น", "คืนนี้"],
  rom: ["chăn", "yàak", "gin", "aa-hăan yêe-bpùn", "keun née"],
  en: "I want to eat Japanese food tonight.",
  less: 15,
  answers: [
    ["ฉัน", "อยาก", "กิน", "อาหารญี่ปุ่น", "คืนนี้"],
    ["คืนนี้", "ฉัน", "อยาก", "กิน", "อาหารญี่ปุ่น"]
  ],
  traps: { th: ["อยากได้", "ต้อง"], rom: ["yàak dâai", "dtông"] }
},
{
  th: ["ผม", "อยาก", "ไปเที่ยว", "ญี่ปุ่น", "เพราะ", "วัฒนธรรม", "น่าสนใจ", "มาก"],
  rom: ["pŏm", "yàak", "bpai tîeow", "yêe-bpùn", "prór", "wát-tá-ná-tam", "nâa sŏn jai", "mâak"],
  en: "I want to travel to Japan because the culture is very interesting.",
  less: 15,
  traps: { th: ["อยากได้", "ต้อง"], rom: ["yàak dâai", "dtông"] }
},
{
  // CHANGED (5 tokens; ต้องการ trap was a valid alternative) — extended with เรื่อง ("about")
  th: ["ผม", "อยาก", "คุย", "กับ", "คุณ", "เรื่อง", "งาน"],
  rom: ["pŏm", "yàak", "kui", "gàp", "kun", "rêuang", "ngaan"],
  en: "I want to talk with you about work.",
  less: 15,
  traps: { th: ["อยากได้", "ต้อง"], rom: ["yàak dâai", "dtông"] }
},
{
  th: ["คุณ", "อยาก", "ไปเที่ยว", "ที่ไหน", "ปีหน้า"],
  rom: ["kun", "yàak", "bpai tîeow", "têe năi", "bpee nâa"],
  en: "Where do you want to travel next year?",
  less: 15,
  answers: [
    ["คุณ", "อยาก", "ไปเที่ยว", "ที่ไหน", "ปีหน้า"],
    ["ปีหน้า", "คุณ", "อยาก", "ไปเที่ยว", "ที่ไหน"]
  ],
  traps: { th: ["อยากได้", "ต้อง"], rom: ["yàak dâai", "dtông"] }
},
{
  th: ["คืนนี้", "ผม", "อยาก", "กิน", "พิซซ่า"],
  rom: ["keun née", "pŏm", "yàak", "gin", "pít-sâa"],
  en: "Tonight I want to eat pizza.",
  less: 15,
  answers: [
    ["คืนนี้", "ผม", "อยาก", "กิน", "พิซซ่า"],
    ["ผม", "อยาก", "กิน", "พิซซ่า", "คืนนี้"]
  ],
  traps: { th: ["อยากได้", "ต้อง"], rom: ["yàak dâai", "dtông"] }  // FIXED trap (ต้องการ -> ต้อง)
},
{
  th: ["พรุ่งนี้", "ฉัน", "อยาก", "พักผ่อน", "อยู่", "บ้าน"],
  rom: ["prûng-née", "chăn", "yàak", "pák pòn", "yòo", "bâan"],
  en: "Tomorrow I want to rest at home.",
  less: 15,
  answers: [
    ["พรุ่งนี้", "ฉัน", "อยาก", "พักผ่อน", "อยู่", "บ้าน"],
    ["ฉัน", "อยาก", "พักผ่อน", "อยู่", "บ้าน", "พรุ่งนี้"]
  ],
  traps: { th: ["อยากได้", "ต้อง"], rom: ["yàak dâai", "dtông"] }  // FIXED trap (ต้องการ -> ต้อง)
},
{
  th: ["ผม", "อยาก", "ไป", "ร้าน", "อาหาร", "กับ", "คุณ"],
  rom: ["pŏm", "yàak", "bpai", "ráan", "aa-hăan", "gàp", "kun"],
  en: "I want to go to a restaurant with you.",
  less: 15,
  traps: { th: ["อยากได้", "ต้อง"], rom: ["yàak dâai", "dtông"] }  // FIXED trap (ต้องการ -> ต้อง)
},
{
  th: ["ผม", "เรียน", "ภาษา", "ไทย", "เพราะ", "อยาก", "คุย", "กับ", "คน", "ไทย"],
  rom: ["pŏm", "rian", "paa-săa", "Thai", "prór", "yàak", "kui", "gàp", "kon", "Thai"],
  en: "I study Thai because I want to talk with Thai people.",
  less: 15,
  traps: { th: ["อยากได้"], rom: ["yàak dâai"] }
},
{
  th: ["ผม", "ไม่", "อยาก", "ไป", "ร้าน", "อาหาร"],
  rom: ["pŏm", "mâi", "yàak", "bpai", "ráan", "aa-hăan"],
  en: "I don't want to go to a restaurant.",
  less: 15,
  traps: { th: ["อยากได้", "ต้อง"], rom: ["yàak dâai", "dtông"] }  // ADDED trap
},
{
  // CHANGED (too easy: 5 tokens, 1 trap) — extended
  th: ["พรุ่งนี้", "ฉัน", "ไม่", "อยาก", "ทำงาน", "เพราะ", "เหนื่อย", "มาก"],
  rom: ["prûng-née", "chăn", "mâi", "yàak", "tam ngaan", "prór", "nèuay", "mâak"],
  en: "Tomorrow I don't want to work because I'm very tired.",
  less: 15,
  answers: [
    ["พรุ่งนี้", "ฉัน", "ไม่", "อยาก", "ทำงาน", "เพราะ", "เหนื่อย", "มาก"],
    ["ฉัน", "ไม่", "อยาก", "ทำงาน", "พรุ่งนี้", "เพราะ", "เหนื่อย", "มาก"]
  ],
  traps: { th: ["อยากได้", "เพื่อ"], rom: ["yàak dâai", "pêua"] }
},
{
  th: ["ผม", "ไม่", "อยาก", "กิน", "อาหาร", "ทะเล"],
  rom: ["pŏm", "mâi", "yàak", "gin", "aa-hăan", "tá-lay"],
  en: "I don't want to eat seafood.",
  less: 15,
  traps: { th: ["ดื่ม", "อยากได้"], rom: ["dèum", "yàak dâai"] }  // ADDED trap
},
{
  th: ["ผม", "ไม่", "อยาก", "เจอ", "กับ", "พ่อแม่", "ของ", "คุณ"],
  rom: ["pŏm", "mâi", "yàak", "jer", "gàp", "pôr mâe", "kŏng", "kun"],
  en: "I don't want to meet with your parents.",
  less: 15,
  traps: { th: ["อยากได้"], rom: ["yàak dâai"] }
},
{
  // CHANGED: was a Lesson 14 (จะ) sentence — now practises อยาก / ไม่อยาก
  th: ["คืนนี้", "ฉัน", "อยาก", "ดู", "หนัง", "น่ากลัว", "แต่", "น้องชาย", "ไม่", "อยาก", "ดู"],
  rom: ["keun née", "chăn", "yàak", "doo", "năng", "nâa glua", "dtàe", "nóng chaai", "mâi", "yàak", "doo"],
  en: "Tonight I want to watch a scary movie, but my younger brother doesn't want to.",
  less: 15,
  traps: { th: ["อยากได้"], rom: ["yàak dâai"] }
},
{
  // CHANGED: was a Lesson 14 (จะ) sentence — now practises อยาก + เพื่อ
  th: ["เดือน", "หน้า", "ผม", "อยาก", "ไป", "หัวหิน", "กับ", "ครอบครัว", "เพื่อ", "พักผ่อน"],
  rom: ["deuan", "nâa", "pŏm", "yàak", "bpai", "Hŭa Hĭn", "gàp", "krôp krua", "pêua", "pák pòn"],
  en: "Next month I want to go to Hua Hin with my family to relax.",
  less: 15,
  traps: { th: ["เพื่อน", "อยากได้"], rom: ["pêuan", "yàak dâai"] }
},
{
  th: ["คืนนี้", "คุณ", "อยาก", "ทำ", "อะไร"],
  rom: ["keun née", "kun", "yàak", "tam", "à-rai"],
  en: "What do you want to do tonight?",
  less: 15,
  answers: [
    ["คืนนี้", "คุณ", "อยาก", "ทำ", "อะไร"],
    ["คุณ", "อยาก", "ทำ", "อะไร", "คืนนี้"]
  ],
  traps: { th: ["อยากได้", "ต้อง"], rom: ["yàak dâai", "dtông"] }  // FIXED trap: ไหม made "คุณอยากทำอะไรไหม" (valid)
},
{
  th: ["ผม", "อยาก", "ไป", "ดู", "หนัง", "กับ", "เพื่อน"],
  rom: ["pŏm", "yàak", "bpai", "doo", "năng", "gàp", "pêuan"],
  en: "I want to go to the cinema with my friends.",
  less: 15,
  traps: { th: ["เรื่อง", "อยากได้"], rom: ["rêuang", "yàak dâai"] }  // ADDED trap
},
{
  th: ["คืนนี้", "คุณ", "อยาก", "ดู", "หนัง", "เรื่อง", "อะไร"],
  rom: ["keun née", "kun", "yàak", "doo", "năng", "rêuang", "à-rai"],
  en: "What movie do you want to watch tonight?",
  less: 15,
  answers: [
    ["คืนนี้", "คุณ", "อยาก", "ดู", "หนัง", "เรื่อง", "อะไร"],
    ["คุณ", "อยาก", "ดู", "หนัง", "เรื่อง", "อะไร", "คืนนี้"]
  ],
  traps: { th: ["ตัว", "อยากได้"], rom: ["dtua", "yàak dâai"] }  // FIXED trap: หนังสือ made "ดูหนังสือ" (= to study), valid
},
{
  th: ["ฉัน", "ไม่", "อยาก", "ดู", "หนัง", "เรื่อง", "นั้น"],
  rom: ["chăn", "mâi", "yàak", "doo", "năng", "rêuang", "nán"],
  en: "I don't want to watch that movie.",
  less: 15,
  traps: { th: ["อยากได้", "นั่น"], rom: ["yàak dâai", "nân"] }  // ADDED trap
},
{
  th: ["ผม", "ไม่", "ชอบ", "หนัง", "เรื่อง", "นี้"],
  rom: ["pŏm", "mâi", "chôp", "năng", "rêuang", "née"],
  en: "I don't like this movie.",
  less: 15,
  traps: { th: ["นี่", "ตัว"], rom: ["nêe", "dtua"] }  // ADDED traps
},
{
  th: ["แฟน", "ของ", "ผม", "ชอบ", "ดู", "หนัง", "เรื่อง", "ไททานิก"],
  rom: ["faen", "kŏng", "pŏm", "chôp", "doo", "năng", "rêuang", "tai-taa-nìk"],
  en: "My girlfriend likes to watch the movie Titanic.",
  less: 15
},
{
  // CHANGED (4 tokens) — extended
  th: ["เสาร์", "นี้", "คุณ", "อยาก", "ไปเที่ยว", "กับ", "ผม", "ไหม"],
  rom: ["săo", "née", "kun", "yàak", "bpai tîeow", "gàp", "pŏm", "măi"],
  en: "Do you want to hang out with me this Saturday?",
  less: 15,
  answers: [
    ["เสาร์", "นี้", "คุณ", "อยาก", "ไปเที่ยว", "กับ", "ผม", "ไหม"],
    ["คุณ", "อยาก", "ไปเที่ยว", "กับ", "ผม", "เสาร์", "นี้", "ไหม"]
  ],
  traps: { th: ["อยากได้", "นี่"], rom: ["yàak dâai", "nêe"] }
},
{
  th: ["คุณ", "อยาก", "ไป", "ดู", "หนัง", "ไหม"],
  rom: ["kun", "yàak", "bpai", "doo", "năng", "măi"],
  en: "Do you want to go to the cinema?",
  less: 15,
  traps: { th: ["ต้อง", "อยากได้"], rom: ["dtông", "yàak dâai"] }
},
{
  // CHANGED (5 tokens, 1 trap; near-copy of "What do you want to do tonight?") — merged with "พรุ่งนี้ว่างไหม" (3 tokens)
  th: ["พรุ่งนี้", "คุณ", "ว่าง", "ไหม", "อยาก", "ไป", "กิน", "ข้าว", "ด้วยกัน", "ไหม"],
  rom: ["prûng-née", "kun", "wâang", "măi", "yàak", "bpai", "gin", "kâao", "dûay gan", "măi"],
  en: "Are you free tomorrow? Do you want to go eat together?",
  less: 15,
  traps: { th: ["อยากได้", "วันหยุด"], rom: ["yàak dâai", "wan yùt"] }
},
{
  th: ["เสาร์อาทิตย์", "นี้", "คุณ", "อยาก", "ทำ", "อะไร"],
  rom: ["săo aa-tít", "née", "kun", "yàak", "tam", "à-rai"],
  en: "What do you want to do this weekend?",
  less: 15,
  answers: [  // ADDED answers
    ["เสาร์อาทิตย์", "นี้", "คุณ", "อยาก", "ทำ", "อะไร"],
    ["คุณ", "อยาก", "ทำ", "อะไร", "เสาร์อาทิตย์", "นี้"]
  ],
  traps: { th: ["ชอบ", "นี่"], rom: ["chôp", "nêe"] }  // ADDED trap
},
{
  th: ["คุณ", "อยาก", "กิน", "พิซซ่า", "หรือ", "แฮมเบอร์เกอร์"],
  rom: ["kun", "yàak", "gin", "pít-sâa", "rĕu", "haem ber-gêr"],
  en: "Do you want to eat pizza or a hamburger?",
  less: 15,
  answers: [
    ["คุณ", "อยาก", "กิน", "พิซซ่า", "หรือ", "แฮมเบอร์เกอร์"],
    ["คุณ", "อยาก", "กิน", "แฮมเบอร์เกอร์", "หรือ", "พิซซ่า"]
  ],
  traps: { th: ["แต่", "อยากได้"], rom: ["dtàe", "yàak dâai"] }
},
{
  // CHANGED: 5 other sentences in this lesson are about dogs/cats
  th: ["คุณ", "อยาก", "ไป", "พิพิธภัณฑ์", "หรือ", "ไป", "นวดไทย"],
  rom: ["kun", "yàak", "bpai", "pí-pít-tá-pan", "rĕu", "bpai", "nûat thai"],
  en: "Do you want to go to a museum or go for a Thai massage?",
  less: 15,
  answers: [
    ["คุณ", "อยาก", "ไป", "พิพิธภัณฑ์", "หรือ", "ไป", "นวดไทย"],
    ["คุณ", "อยาก", "ไป", "นวดไทย", "หรือ", "ไป", "พิพิธภัณฑ์"]
  ],
  traps: { th: ["อยากได้", "แต่"], rom: ["yàak dâai", "dtàe"] }
},
{
  // CHANGED: was a Lesson 14 (จะ) sentence — now อยาก + หรือ
  th: ["คืนนี้", "คุณ", "อยาก", "ดู", "หนัง", "หรือ", "ฟัง", "เพลง"],
  rom: ["keun née", "kun", "yàak", "doo", "năng", "rĕu", "fang", "pleng"],
  en: "Tonight do you want to watch a movie or listen to music?",
  less: 15,
  answers: [
    ["คืนนี้", "คุณ", "อยาก", "ดู", "หนัง", "หรือ", "ฟัง", "เพลง"],
    ["คืนนี้", "คุณ", "อยาก", "ฟัง", "เพลง", "หรือ", "ดู", "หนัง"],
    ["คุณ", "อยาก", "ดู", "หนัง", "หรือ", "ฟัง", "เพลง", "คืนนี้"],
    ["คุณ", "อยาก", "ฟัง", "เพลง", "หรือ", "ดู", "หนัง", "คืนนี้"]
  ],
  traps: { th: ["อยากได้", "แต่"], rom: ["yàak dâai", "dtàe"] }
},
{
  th: ["เดือน", "หน้า", "ผม", "อยาก", "ไป", "ภูเก็ต", "หรือ", "กระบี่", "กับ", "แฟน"],
  rom: ["deuan", "nâa", "pŏm", "yàak", "bpai", "poo-gèt", "rĕu", "grà-bèe", "gàp", "faen"],
  en: "Next month I want to go to Phuket or Krabi with my girlfriend.",
  less: 15,
  answers: [
    ["เดือน", "หน้า", "ผม", "อยาก", "ไป", "ภูเก็ต", "หรือ", "กระบี่", "กับ", "แฟน"],
    ["เดือน", "หน้า", "ผม", "อยาก", "ไป", "กระบี่", "หรือ", "ภูเก็ต", "กับ", "แฟน"],
    ["ผม", "อยาก", "ไป", "ภูเก็ต", "หรือ", "กระบี่", "กับ", "แฟน", "เดือน", "หน้า"],   // ADDED
    ["ผม", "อยาก", "ไป", "กระบี่", "หรือ", "ภูเก็ต", "กับ", "แฟน", "เดือน", "หน้า"]    // ADDED
  ],
  traps: { th: ["แต่"], rom: ["dtàe"] }  // ADDED trap
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["ปี", "นี้", "ฉัน", "อยาก", "สวย", "และ", "แข็งแรง"],
  rom: ["bpee", "née", "chăn", "yàak", "sŭay", "láe", "kăeng raeng"],
  en: "This year I want to be beautiful and healthy.",
  less: 15,
  answers: [
    ["ปี", "นี้", "ฉัน", "อยาก", "สวย", "และ", "แข็งแรง"],
    ["ปี", "นี้", "ฉัน", "อยาก", "แข็งแรง", "และ", "สวย"],
    ["ฉัน", "อยาก", "สวย", "และ", "แข็งแรง", "ปี", "นี้"],
    ["ฉัน", "อยาก", "แข็งแรง", "และ", "สวย", "ปี", "นี้"]
  ],
  traps: { th: ["ซวย", "อยากได้"], rom: ["suay", "yàak dâai"] }
},
{
  // CHANGED (too easy: 5 tokens, 0 traps) — extended
  th: ["ผม", "อยาก", "รวย", "มาก", "มาก", "เพราะ", "อยาก", "มี", "บ้าน", "หลัง", "ใหญ่"],
  rom: ["pŏm", "yàak", "ruay", "mâak", "mâak", "prór", "yàak", "mee", "bâan", "lăng", "yài"],
  en: "I want to be very, very rich because I want to have a big house.",
  less: 15,
  traps: { th: ["คัน", "อยากได้"], rom: ["kan", "yàak dâai"] }
},
{
  th: ["ผม", "อยาก", "ซื้อ", "รถ", "คัน", "นี้"],
  rom: ["pŏm", "yàak", "séu", "rót", "kan", "née"],
  en: "I want to buy this car.",
  less: 15,
  traps: { th: ["ตัว", "อยากได้"], rom: ["dtua", "yàak dâai"] }  // ADDED traps
},
{
  th: ["ฉัน", "อยาก", "มี", "แฟน", "เพราะ", "ไม่", "อยาก", "เหงา"],
  rom: ["chăn", "yàak", "mee", "faen", "prór", "mâi", "yàak", "ngăo"],
  en: "I want to have a boyfriend because I don't want to be lonely.",
  less: 15,
  traps: { th: ["อยากได้"], rom: ["yàak dâai"] }  // ADDED trap
},
{
  th: ["ขอโทษ", "นะ", "ผม", "ต้อง", "กลับบ้าน"],
  rom: ["kŏr tôht", "ná", "pŏm", "dtông", "glàp bâan"],
  en: "Sorry, I have to go home.",
  less: 15,
  traps: { th: ["ต้องการ", "อยากได้"], rom: ["dtông gaan", "yàak dâai"] }
},
{
  // CHANGED (too easy: 4 tokens, 1 trap; "ต้องทำงาน" is used 4 more times in this lesson)
  th: ["พรุ่งนี้", "ฉัน", "ต้อง", "ไป", "หา", "หมอ", "เพราะ", "ไม่", "สบาย"],
  rom: ["prûng-née", "chăn", "dtông", "bpai", "hăa", "mŏr", "prór", "mâi", "sà-baai"],
  en: "Tomorrow I have to go see the doctor because I'm not feeling well.",
  less: 15,
  answers: [
    ["พรุ่งนี้", "ฉัน", "ต้อง", "ไป", "หา", "หมอ", "เพราะ", "ไม่", "สบาย"],
    ["ฉัน", "ต้อง", "ไป", "หา", "หมอ", "พรุ่งนี้", "เพราะ", "ไม่", "สบาย"]
  ],
  traps: { th: ["ต้องการ", "ห้า"], rom: ["dtông gaan", "hâa"] }
},
{
  th: ["วันนี้", "ภรรยา", "ของ", "ผม", "ต้อง", "ทำงาน"],
  rom: ["wan née", "pan-rá-yaa", "kŏng", "pŏm", "dtông", "tam ngaan"],
  en: "Today my wife has to work.",
  less: 15,
  answers: [  // ADDED answers
    ["วันนี้", "ภรรยา", "ของ", "ผม", "ต้อง", "ทำงาน"],
    ["ภรรยา", "ของ", "ผม", "ต้อง", "ทำงาน", "วันนี้"]
  ],
  traps: { th: ["ต้องการ", "อยากได้"], rom: ["dtông gaan", "yàak dâai"] }
},
{
  // CHANGED (6 tokens, 1 trap) — extended with a reason
  th: ["ผม", "ต้อง", "โทรหา", "เจ้านาย", "เพราะ", "พรุ่งนี้", "ผม", "ไป", "ทำงาน", "ไม่", "ได้"],
  rom: ["pŏm", "dtông", "toh hăa", "jâo naai", "prór", "prûng-née", "pŏm", "bpai", "tam ngaan", "mâi", "dâai"],
  en: "I have to call my boss because I can't go to work tomorrow.",
  less: 15,
  answers: [
    ["ผม", "ต้อง", "โทรหา", "เจ้านาย", "เพราะ", "พรุ่งนี้", "ผม", "ไป", "ทำงาน", "ไม่", "ได้"],
    ["ผม", "ต้อง", "โทรหา", "เจ้านาย", "เพราะ", "ผม", "ไป", "ทำงาน", "พรุ่งนี้", "ไม่", "ได้"]
  ],
  traps: { th: ["ต้องการ"], rom: ["dtông gaan"] }
},
{
  // CHANGED (too easy: 5 tokens, 1 trap) — extended
  th: ["พรุ่งนี้", "ผม", "ต้อง", "ตื่น", "แต่เช้า", "เพราะ", "ต้อง", "ไป", "สนามบิน"],
  rom: ["prûng-née", "pŏm", "dtông", "dtèun", "dtàe cháo", "prór", "dtông", "bpai", "sà-năam bin"],
  en: "Tomorrow I have to wake up early because I have to go to the airport.",
  less: 15,
  answers: [
    ["พรุ่งนี้", "ผม", "ต้อง", "ตื่น", "แต่เช้า", "เพราะ", "ต้อง", "ไป", "สนามบิน"],
    ["ผม", "ต้อง", "ตื่น", "แต่เช้า", "พรุ่งนี้", "เพราะ", "ต้อง", "ไป", "สนามบิน"]
  ],
  traps: { th: ["ต้องการ", "แต่"], rom: ["dtông gaan", "dtàe"] }
},
{
  // CHANGED (too easy: 5 tokens, 1 trap) — ต้อง vs ไม่อยาก
  th: ["พรุ่งนี้", "ฉัน", "ต้อง", "ไป", "โรงเรียน", "แต่", "ฉัน", "ไม่", "อยาก", "ไป"],
  rom: ["prûng-née", "chăn", "dtông", "bpai", "rohng rian", "dtàe", "chăn", "mâi", "yàak", "bpai"],
  en: "Tomorrow I have to go to school, but I don't want to go.",
  less: 15,
  answers: [
    ["พรุ่งนี้", "ฉัน", "ต้อง", "ไป", "โรงเรียน", "แต่", "ฉัน", "ไม่", "อยาก", "ไป"],
    ["ฉัน", "ต้อง", "ไป", "โรงเรียน", "พรุ่งนี้", "แต่", "ฉัน", "ไม่", "อยาก", "ไป"]
  ],
  traps: { th: ["ต้องการ", "อยากได้"], rom: ["dtông gaan", "yàak dâai"] }
},
{
  th: ["ผม", "อยาก", "ไปเที่ยว", "แต่", "พรุ่งนี้", "ต้อง", "ทำงาน"],
  rom: ["pŏm", "yàak", "bpai tîeow", "dtàe", "prûng-née", "dtông", "tam ngaan"],
  en: "I want to hang out, but tomorrow I have to work.",
  less: 15,
  traps: { th: ["อยากได้"], rom: ["yàak dâai"] }  // FIXED: removed ต้องการ ("ผมต้องการไปเที่ยว" is valid)
},
{
  th: ["เรา", "ต้อง", "มี", "วีซ่า", "เพื่อ", "ไป", "ประเทศจีน"],
  rom: ["rao", "dtông", "mee", "wee-sâa", "pêua", "bpai", "bprà-têt jeen"],
  en: "We have to have a visa in order to go to China.",
  less: 15
},
{
  // CHANGED (3 tokens — "พรุ่งนี้ว่างไหม" was merged into "Are you free tomorrow?…" above)
  th: ["วันเสาร์", "ผม", "ไม่", "ว่าง", "เพราะ", "ต้อง", "ไปเยี่ยม", "พ่อแม่", "แต่", "วันอาทิตย์", "ว่าง"],
  rom: ["wan săo", "pŏm", "mâi", "wâang", "prór", "dtông", "bpai yîam", "pôr mâe", "dtàe", "wan aa-tít", "wâang"],
  en: "I'm not free on Saturday because I have to visit my parents, but I'm free on Sunday.",
  less: 15,
  traps: { th: ["ต้องการ", "เพื่อ"], rom: ["dtông gaan", "pêua"] }
},
{
  th: ["ภรรยา", "ของ", "ผม", "อยาก", "มี", "ลูก", "แต่", "ผม", "ไม่", "อยาก", "มี"],
  rom: ["pan-rá-yaa", "kŏng", "pŏm", "yàak", "mee", "lôok", "dtàe", "pŏm", "mâi", "yàak", "mee"],
  en: "My wife wants to have children, but I don't want to.",
  less: 15,
  traps: { th: ["อยากได้"], rom: ["yàak dâai"] }  // ADDED trap
},
{
  // CHANGED (too easy: 5 tokens, 1 trap; บอก trap was weak — "บอกกับเขา" is valid) — extended
  th: ["คุณ", "ต้อง", "คุย", "กับ", "เขา", "เพราะ", "เขา", "เศร้า", "มาก"],
  rom: ["kun", "dtông", "kui", "gàp", "kăo", "prór", "kăo", "sâo", "mâak"],
  en: "You have to talk with her because she's very sad.",
  less: 15,
  traps: { th: ["ต้องการ", "เพื่อ"], rom: ["dtông gaan", "pêua"] }
},
{
  th: ["คุณ", "อยาก", "มี", "ลูก", "กี่", "คน"],
  rom: ["kun", "yàak", "mee", "lôok", "gèe", "kon"],
  en: "How many children do you want to have?",
  less: 15,
  traps: { th: ["คัน", "ตัว"], rom: ["kan", "dtua"] }  // ADDED trap
},
{
  th: ["ทำไม", "คุณ", "ไม่", "อยาก", "มี", "ลูก"],
  rom: ["tam-mai", "kun", "mâi", "yàak", "mee", "lôok"],
  en: "Why don't you want to have children?",
  less: 15,
  answers: [  // ADDED answers
    ["ทำไม", "คุณ", "ไม่", "อยาก", "มี", "ลูก"],
    ["คุณ", "ไม่", "อยาก", "มี", "ลูก", "ทำไม"]
  ],
  traps: { th: ["อยากได้"], rom: ["yàak dâai"] }  // ADDED trap
},
{
  th: ["พรุ่งนี้", "คุณ", "อยาก", "ไป", "พิพิธภัณฑ์", "ด้วยกัน", "ไหม"],
  rom: ["prûng-née", "kun", "yàak", "bpai", "pí-pít-tá-pan", "dûay gan", "măi"],
  en: "Do you want to go to a museum together tomorrow?",
  less: 15,
  answers: [
    ["พรุ่งนี้", "คุณ", "อยาก", "ไป", "พิพิธภัณฑ์", "ด้วยกัน", "ไหม"],
    ["คุณ", "อยาก", "ไป", "พิพิธภัณฑ์", "ด้วยกัน", "พรุ่งนี้", "ไหม"],   // ADDED (the more natural end position)
    ["คุณ", "อยาก", "ไป", "พิพิธภัณฑ์", "ด้วยกัน", "ไหม", "พรุ่งนี้"]
  ],
  traps: { th: ["อยากได้"], rom: ["yàak dâai"] }  // ADDED trap
},
{
  // CHANGED (5 tokens, 0 traps; a จะ sentence) — now practises ด้วย (too / along)
  th: ["พรุ่งนี้", "เช้า", "ผม", "จะ", "ไป", "ออกกำลังกาย", "คุณ", "อยาก", "ไป", "ด้วย", "ไหม"],
  rom: ["prûng-née", "cháo", "pŏm", "jà", "bpai", "òk gam-lang gaai", "kun", "yàak", "bpai", "dûay", "măi"],
  en: "Tomorrow morning I'm going to work out. Do you want to come too?",
  less: 15,
  answers: [
    ["พรุ่งนี้", "เช้า", "ผม", "จะ", "ไป", "ออกกำลังกาย", "คุณ", "อยาก", "ไป", "ด้วย", "ไหม"],
    ["ผม", "จะ", "ไป", "ออกกำลังกาย", "พรุ่งนี้", "เช้า", "คุณ", "อยาก", "ไป", "ด้วย", "ไหม"]
  ],
  traps: { th: ["อยากได้", "เมื่อวาน"], rom: ["yàak dâai", "mêua waan"] }
},
{
  th: ["คุณ", "อยาก", "ไป", "นวด", "ด้วยกัน", "ไหม"],
  rom: ["kun", "yàak", "bpai", "nûat", "dûay gan", "măi"],
  en: "Do you want to go for a massage together?",
  less: 15,
  traps: { th: ["อยากได้", "ต้อง"], rom: ["yàak dâai", "dtông"] }  // ADDED trap
},
{
  th: ["เรา", "ไป", "ด้วยกัน", "ได้", "เพราะ", "วันอาทิตย์", "ผม", "หยุด"],
  rom: ["rao", "bpai", "dûay gan", "dâai", "prór", "wan aa-tít", "pŏm", "yùt"],
  en: "We can go together because Sunday is my day off.",
  less: 15,
  traps: { th: ["วันหยุด"], rom: ["wan yùt"] }  // ADDED trap
},
{
  th: ["หน้าร้อน", "ปี", "นี้", "คุณ", "อยาก", "ไปเที่ยว", "ที่ไหน"],
  rom: ["nâa rón", "bpee", "née", "kun", "yàak", "bpai tîeow", "têe năi"],
  en: "Where do you want to travel this summer?",
  less: 15,
  answers: [  // ADDED answers
    ["หน้าร้อน", "ปี", "นี้", "คุณ", "อยาก", "ไปเที่ยว", "ที่ไหน"],
    ["คุณ", "อยาก", "ไปเที่ยว", "ที่ไหน", "หน้าร้อน", "ปี", "นี้"]
  ],
  traps: { th: ["อะไร", "นี่"], rom: ["à-rai", "nêe"] }  // ADDED trap
},
{
  th: ["ผม", "อยาก", "ไป", "ประเทศจีน", "แต่", "ภรรยา", "อยาก", "ไป", "ยุโรป"],
  rom: ["pŏm", "yàak", "bpai", "bprà-têt jeen", "dtàe", "pan-rá-yaa", "yàak", "bpai", "yú-ròhp"],
  en: "I want to go to China, but my wife wants to go to Europe.",
  less: 15,
  traps: { th: ["อยากได้"], rom: ["yàak dâai"] }  // ADDED trap
},
{
  th: ["ผม", "ต้อง", "เลือก", "ยุโรป", "เพราะ", "ภรรยา"],
  rom: ["pŏm", "dtông", "lêuak", "yú-ròhp", "prór", "pan-rá-yaa"],
  en: "I have to choose Europe because of my wife.",
  less: 15,
  traps: { th: ["ต้องการ"], rom: ["dtông gaan"] }  // ADDED trap
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["คุณ", "จะ", "เลือก", "อะไร", "กาแฟ", "หรือ", "ชา"],
  rom: ["kun", "jà", "lêuak", "à-rai", "gaa-fae", "rĕu", "chaa"],
  en: "What will you choose, coffee or tea?",
  less: 15,
  answers: [
    ["คุณ", "จะ", "เลือก", "อะไร", "กาแฟ", "หรือ", "ชา"],
    ["คุณ", "จะ", "เลือก", "อะไร", "ชา", "หรือ", "กาแฟ"]
  ],
  traps: { th: ["ช้า", "แต่"], rom: ["cháa", "dtàe"] }
},
{
  // CHANGED (too easy: 3 tokens)
  th: ["ผม", "ต้องการ", "ยา", "ร้านขายยา", "อยู่", "ที่ไหน", "ครับ"],
  rom: ["pŏm", "dtông gaan", "yaa", "ráan kăai yaa", "yòo", "têe năi", "kráp"],
  en: "I need medicine. Where is the pharmacy?",
  less: 15,
  traps: { th: ["อยากได้", "อยาก"], rom: ["yàak dâai", "yàak"] }
},
{
  // CHANGED (too easy: 4 tokens) — now practises เพื่อ (for / in order to)
  th: ["ผม", "ต้องการ", "รองเท้า", "ใหม่", "เพื่อ", "ออกกำลังกาย"],
  rom: ["pŏm", "dtông gaan", "rong táo", "mài", "pêua", "òk gam-lang gaai"],
  en: "I need new shoes for exercising.",
  less: 15,
  traps: { th: ["อยาก", "เพื่อน"], rom: ["yàak", "pêuan"] }
},
{
  // CHANGED (too easy: 3 tokens)
  th: ["ขอโทษ", "ครับ", "ผม", "ต้องการ", "ความช่วยเหลือ", "ช่วย", "ผม", "หน่อย", "ได้", "ไหม", "ครับ"],
  rom: ["kŏr tôht", "kráp", "pŏm", "dtông gaan", "kwaam chûay lĕua", "chûay", "pŏm", "nòi", "dâai", "măi", "kráp"],
  en: "Excuse me, I need help. Can you help me, please?",
  less: 15,
  traps: { th: ["อยากได้"], rom: ["yàak dâai"] }
},
{
  // CHANGED: same meaning as "I need medicine" above — now practises ต้อง
  th: ["ลูกสาว", "ของ", "ฉัน", "ไม่", "สบาย", "เธอ", "ต้อง", "กิน", "ยา"],
  rom: ["lôok săao", "kŏng", "chăn", "mâi", "sà-baai", "ter", "dtông", "gin", "yaa"],
  en: "My daughter is sick. She has to take medicine.",
  less: 15,
  traps: { th: ["ต้องการ"], rom: ["dtông gaan"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps; Lesson 13 grammar) — uses the L15 phrase พูดช้าๆ ได้ไหม
  th: ["ช่วย", "พูด", "ช้าๆ", "หน่อย", "ได้", "ไหม", "ครับ", "ผม", "พูด", "ภาษา", "ไทย", "ได้", "นิดหน่อย"],
  rom: ["chûay", "pôot", "cháa cháa", "nòi", "dâai", "măi", "kráp", "pŏm", "pôot", "paa-săa", "Thai", "dâai", "nít nòi"],
  en: "Could you speak slowly, please? I can only speak a little Thai.",
  less: 15
},
{
  // CHANGED (too easy: 3 tokens)
  th: ["คุณ", "หา", "อะไร", "อยู่", "ผม", "หา", "กุญแจ", "รถ", "ไม่", "เจอ"],
  rom: ["kun", "hăa", "à-rai", "yòo", "pŏm", "hăa", "gun-jae", "rót", "mâi", "jer"],
  en: "What are you looking for? — I can't find my car key.",
  less: 15,
  traps: { th: ["ห้า"], rom: ["hâa"] }
},
{
  th: ["ผม", "อยาก", "ไป", "กิน", "ผัดไทย", "กับ", "เพื่อน"],
  rom: ["pŏm", "yàak", "bpai", "gin", "pàt thai", "gàp", "pêuan"],
  en: "I want to go and eat Pad Thai with my friends.",
  less: 15,
  traps: { th: ["อยากได้", "และ"], rom: ["yàak dâai", "láe"] }  // ADDED traps
},
{
  th: ["แฟน", "ของ", "ผม", "ต้อง", "ทำงาน", "วันอาทิตย์", "นี้"],
  rom: ["faen", "kŏng", "pŏm", "dtông", "tam ngaan", "wan aa-tít", "née"],
  en: "My girlfriend has to work this Sunday.",
  less: 15,
  answers: [  // ADDED answers
    ["แฟน", "ของ", "ผม", "ต้อง", "ทำงาน", "วันอาทิตย์", "นี้"],
    ["วันอาทิตย์", "นี้", "แฟน", "ของ", "ผม", "ต้อง", "ทำงาน"]
  ],
  traps: { th: ["อยากได้", "นี่"], rom: ["yàak dâai", "nêe"] }  // ADDED trap
},
{
  // CHANGED: อยาก + ได้ were split here (อยากได้ is one token everywhere else); 5 tokens, 1 trap
  th: ["ผม", "อยากได้", "รองเท้า", "ใหม่", "แต่", "ผม", "ไม่", "มี", "เงิน"],
  rom: ["pŏm", "yàak dâai", "rong táo", "mài", "dtàe", "pŏm", "mâi", "mee", "ngern"],
  en: "I want new shoes, but I don't have money.",
  less: 15,
  traps: { th: ["อยาก", "ไม่ใช่"], rom: ["yàak", "mâi châi"] }
},
{
  // CHANGED (too easy: 4 tokens, 1 trap)
  th: ["แฟน", "ของ", "ฉัน", "อยากได้", "เสื้อยืด", "สีดำ", "แต่", "ฉัน", "คิด", "ว่า", "สีแดง", "สวย", "กว่า"],
  rom: ["faen", "kŏng", "chăn", "yàak dâai", "sêua yêut", "sĕe dam", "dtàe", "chăn", "kít", "wâa", "sĕe daeng", "sŭay", "gwàa"],
  en: "My boyfriend wants a black T-shirt, but I think red is prettier.",
  less: 15,
  traps: { th: ["อยาก"], rom: ["yàak"] }
},
{
  // CHANGED (too easy: 4 tokens, 1 trap)
  th: ["ผม", "อยากได้", "โทรศัพท์", "ใหม่", "เพราะ", "โทรศัพท์", "ของ", "ผม", "ช้า", "มาก"],
  rom: ["pŏm", "yàak dâai", "toh-rá-sàp", "mài", "prór", "toh-rá-sàp", "kŏng", "pŏm", "cháa", "mâak"],
  en: "I want a new phone because my phone is very slow.",
  less: 15,
  traps: { th: ["อยาก", "ชา"], rom: ["yàak", "chaa"] }
},
{
  // CHANGED: อยาก + ได้ split (as above); 0 traps
  th: ["ฉัน", "ไม่", "อยากได้", "กระเป๋าตังค์", "สีดำ", "ฉัน", "อยากได้", "สีเขียว"],
  rom: ["chăn", "mâi", "yàak dâai", "grà-bpăo dtang", "sĕe dam", "chăn", "yàak dâai", "sĕe kĭeow"],
  en: "I don't want a black wallet. I want a green one.",
  less: 15,
  traps: { th: ["อยาก"], rom: ["yàak"] }
},
{
  // FIXED: อยาก + ได้ split into one token (อยากได้)
  th: ["วันเกิด", "นี้", "คุณ", "อยากได้", "อะไร"],
  rom: ["wan gèrt", "née", "kun", "yàak dâai", "à-rai"],
  en: "What do you want for your birthday?",
  less: 15,
  answers: [
    ["วันเกิด", "นี้", "คุณ", "อยากได้", "อะไร"],
    ["คุณ", "อยากได้", "อะไร", "วันเกิด", "นี้"]
  ],
  traps: { th: ["อยาก", "นี่"], rom: ["yàak", "nêe"] }
},
{
  // CHANGED (too easy: 5 tokens, 1 trap)
  th: ["ลูกชาย", "ของ", "ผม", "อยากได้", "หมา", "แต่", "ลูกสาว", "อยากได้", "แมว"],
  rom: ["lôok chaai", "kŏng", "pŏm", "yàak dâai", "măa", "dtàe", "lôok săao", "yàak dâai", "maew"],
  en: "My son wants a dog, but my daughter wants a cat.",
  less: 15,
  traps: { th: ["อยาก"], rom: ["yàak"] }
},
{
  // CHANGED (too easy: 5 tokens, 1 trap; one of 5 dog/cat sentences)
  th: ["อาทิตย์", "หน้า", "ผม", "จะ", "ไป", "เชียงใหม่", "คุณ", "อยากได้", "อะไร", "ไหม"],
  rom: ["aa-tít", "nâa", "pŏm", "jà", "bpai", "chiang-mài", "kun", "yàak dâai", "à-rai", "măi"],
  en: "Next week I'm going to Chiang Mai. Do you want anything?",
  less: 15,
  answers: [
    ["อาทิตย์", "หน้า", "ผม", "จะ", "ไป", "เชียงใหม่", "คุณ", "อยากได้", "อะไร", "ไหม"],
    ["ผม", "จะ", "ไป", "เชียงใหม่", "อาทิตย์", "หน้า", "คุณ", "อยากได้", "อะไร", "ไหม"]
  ],
  traps: { th: ["อยาก", "เมื่อวาน"], rom: ["yàak", "mêua waan"] }
},
{
  // CHANGED (too easy: 5 tokens, 0 traps; "ไม่อร่อย" is blunt — ไม่ค่อยอร่อย is the natural, polite way)
  th: ["ผม", "คิด", "ว่า", "ร้าน", "นี้", "ไม่ค่อย", "อร่อย", "แต่", "ถูก", "มาก"],
  rom: ["pŏm", "kít", "wâa", "ráan", "née", "mâi kôi", "à-ròi", "dtàe", "tòok", "mâak"],
  en: "I think this restaurant isn't very tasty, but it's very cheap.",
  less: 15,
  traps: { th: ["นี่"], rom: ["nêe"] }
},
{
  th: ["ฉัน", "คิด", "ว่า", "หนัง", "เรื่อง", "นี้", "สนุก", "มาก"],
  rom: ["chăn", "kít", "wâa", "năng", "rêuang", "née", "sà-nùk", "mâak"],
  en: "I think this movie is really fun.",
  less: 15,
  traps: { th: ["นี่"], rom: ["nêe"] }  // ADDED trap
},
{
  // CHANGED (6 tokens, 0 traps) — extended
  th: ["ผม", "คิด", "ว่า", "ภาษา", "ไทย", "ยาก", "แต่", "สนุก", "มาก"],
  rom: ["pŏm", "kít", "wâa", "paa-săa", "Thai", "yâak", "dtàe", "sà-nùk", "mâak"],
  en: "I think Thai is difficult, but very fun.",
  less: 15,
  traps: { th: ["ง่าย"], rom: ["ngâai"] }
},
{
  // CHANGED (6 tokens, 0 traps; 4 near-identical "this restaurant/shop" opinion sentences)
  th: ["ฉัน", "คิด", "ว่า", "โรงแรม", "นี้", "แพง", "เกินไป"],
  rom: ["chăn", "kít", "wâa", "rohng raem", "née", "paeng", "gern bpai"],
  en: "I think this hotel is too expensive.",
  less: 15,
  traps: { th: ["นี่"], rom: ["nêe"] }
},
{
  th: ["คุณ", "คิด", "ยังไง", "เกี่ยวกับ", "ประเทศ", "ไทย"],
  rom: ["kun", "kít", "yang ngai", "gìeow gàp", "bprà-têt", "Thai"],
  en: "What do you think about Thailand?",
  less: 15,
  traps: { th: ["อะไร"], rom: ["à-rai"] }  // ADDED trap (the classic learner mistake "คิดอะไร")
},
{
  th: ["คุณ", "คิด", "ยังไง", "เกี่ยวกับ", "ร้าน", "นี้"],
  rom: ["kun", "kít", "yang ngai", "gìeow gàp", "ráan", "née"],
  en: "What do you think about this restaurant?",
  less: 15,
  traps: { th: ["อะไร", "นี่"], rom: ["à-rai", "nêe"] }  // ADDED traps
},
{
  // CHANGED (one of 4 identical "คุณคิดยังไงเกี่ยวกับ…" sentences)
  th: ["ผม", "คิด", "ว่า", "หนัง", "เรื่อง", "นี้", "น่าเบื่อ", "คุณ", "คิด", "ยังไง"],
  rom: ["pŏm", "kít", "wâa", "năng", "rêuang", "née", "nâa bèua", "kun", "kít", "yang ngai"],
  en: "I think this movie is boring. What do you think?",
  less: 15,
  traps: { th: ["เบื่อ", "นี่"], rom: ["bèua", "nêe"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["ขอโทษ", "ครับ", "ผม", "ไม่", "เข้าใจ", "พูด", "อีกครั้ง", "ได้", "ไหม", "ครับ"],
  rom: ["kŏr tôht", "kráp", "pŏm", "mâi", "kâo jai", "pôot", "èek kráng", "dâai", "măi", "kráp"],
  en: "Sorry, I don't understand. Can you say it again?",
  less: 15
},
{
  // CHANGED: "I want new shoes because I want to be fit" doesn't quite follow
  th: ["ผม", "ออกกำลังกาย", "เพราะ", "อยาก", "แข็งแรง", "ไม่ใช่", "เพราะ", "อยาก", "หล่อ"],
  rom: ["pŏm", "òk gam-lang gaai", "prór", "yàak", "kăeng raeng", "mâi châi", "prór", "yàak", "lòr"],
  en: "I exercise because I want to be healthy, not because I want to be handsome.",
  less: 15,
  traps: { th: ["เพื่อ", "ไม่"], rom: ["pêua", "mâi"] }
},
{
  th: ["ฉัน", "คิด", "ว่า", "ส้มตำ", "อร่อย", "แต่", "เผ็ด", "มาก"],
  rom: ["chăn", "kít", "wâa", "sôm dtam", "à-ròi", "dtàe", "pèt", "mâak"],
  en: "I think papaya salad is delicious, but very spicy.",
  less: 15
},
{
  // CHANGED (5 tokens, 2 traps; one of 5 dog/cat sentences) — a real hotel request
  th: ["ขอโทษ", "ครับ", "ผม", "อยากได้", "ห้อง", "ใหญ่", "กว่า", "นี้"],
  rom: ["kŏr tôht", "kráp", "pŏm", "yàak dâai", "hông", "yài", "gwàa", "née"],
  en: "Excuse me, I'd like a bigger room than this.",
  less: 15,
  traps: { th: ["อยาก", "นี่"], rom: ["yàak", "nêe"] }
},
{
  th: ["หน้าหนาว", "นี้", "ผม", "อยาก", "ไปเที่ยว", "นอร์เวย์"],
  rom: ["nâa năao", "née", "pŏm", "yàak", "bpai tîeow", "nor-way"],
  en: "I want to visit Norway this winter.",
  less: 15,
  answers: [  // ADDED answers
    ["หน้าหนาว", "นี้", "ผม", "อยาก", "ไปเที่ยว", "นอร์เวย์"],
    ["ผม", "อยาก", "ไปเที่ยว", "นอร์เวย์", "หน้าหนาว", "นี้"]
  ],
  traps: { th: ["อยากได้", "นี่"], rom: ["yàak dâai", "nêe"] }  // ADDED traps
},
{
  // CHANGED (one of 4 identical "คุณคิดยังไงเกี่ยวกับ…" sentences)
  th: ["เพื่อน", "คิด", "ว่า", "อาหารไทย", "เผ็ด", "เกินไป", "แต่", "ผม", "คิด", "ว่า", "อร่อย", "มาก"],
  rom: ["pêuan", "kít", "wâa", "aa-hăan Thai", "pèt", "gern bpai", "dtàe", "pŏm", "kít", "wâa", "à-ròi", "mâak"],
  en: "My friend thinks Thai food is too spicy, but I think it's very delicious.",
  less: 15
},
{
  // CHANGED: "I want a T-shirt and I want to go traveling" joined two unrelated wishes
  th: ["วันเกิด", "นี้", "ผม", "ไม่", "อยากได้", "อะไร", "ผม", "อยาก", "ไปเที่ยว", "ทะเล", "กับ", "ครอบครัว"],
  rom: ["wan gèrt", "née", "pŏm", "mâi", "yàak dâai", "à-rai", "pŏm", "yàak", "bpai tîeow", "tá-lay", "gàp", "krôp krua"],
  en: "For my birthday I don't want anything. I want to go on a trip to the sea with my family.",
  less: 15
},
{
  // CHANGED: near-copy of "Do you want to go for a massage together?" — now practises ไม่ต้อง (no need to)
  th: ["ไม่", "ต้อง", "รีบ", "นะ", "เรา", "มี", "เวลา"],
  rom: ["mâi", "dtông", "rêep", "ná", "rao", "mee", "way-laa"],
  en: "No need to rush, we have time.",
  less: 15,
  traps: { th: ["ต้องการ"], rom: ["dtông gaan"] }
},
{
  th: ["วันนี้", "ผม", "หยุด", "ผม", "อยาก", "พักผ่อน", "อยู่", "บ้าน"],
  rom: ["wan née", "pŏm", "yùt", "pŏm", "yàak", "pák pòn", "yòo", "bâan"],
  en: "Today is my day off, I want to rest at home.",
  less: 15,
  traps: { th: ["วันหยุด", "อยากได้"], rom: ["wan yùt", "yàak dâai"] }  // ADDED traps
},
{
  // CHANGED (5th "I think this restaurant/shop is…" sentence) — คิดว่า + จะ
  th: ["ฉัน", "คิด", "ว่า", "เขา", "จะ", "ไม่", "มา", "เพราะ", "เขา", "ไม่", "ว่าง"],
  rom: ["chăn", "kít", "wâa", "kăo", "jà", "mâi", "maa", "prór", "kăo", "mâi", "wâang"],
  en: "I think he won't come because he's not free.",
  less: 15,
  traps: { th: ["อยาก"], rom: ["yàak"] }
},

// ===== LESSON 16 (Past) =====

{
  // CHANGED (too easy: 5 tokens, 0 traps) — extended with a reason
  th: ["เมื่อวาน", "ผม", "ไป", "หา", "หมอ", "เพราะ", "เป็นไข้", "และ", "ไอ"],
  rom: ["mêua waan", "pŏm", "bpai", "hăa", "mŏr", "prór", "bpen kâi", "láe", "ai"],
  en: "Yesterday I went to see the doctor because I had a fever and a cough.",
  less: 16,
  answers: [
    ["เมื่อวาน", "ผม", "ไป", "หา", "หมอ", "เพราะ", "เป็นไข้", "และ", "ไอ"],
    ["เมื่อวาน", "ผม", "ไป", "หา", "หมอ", "เพราะ", "ไอ", "และ", "เป็นไข้"],
    ["ผม", "ไป", "หา", "หมอ", "เมื่อวาน", "เพราะ", "เป็นไข้", "และ", "ไอ"],
    ["ผม", "ไป", "หา", "หมอ", "เมื่อวาน", "เพราะ", "ไอ", "และ", "เป็นไข้"]
  ],
  traps: { th: ["ห้า", "แต่"], rom: ["hâa", "dtàe"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["เมื่อคืน", "ฉัน", "นอน", "ดึก", "เพราะ", "ต้อง", "ทำการบ้าน"],
  rom: ["mêua keun", "chăn", "non", "dèuk", "prór", "dtông", "tam gaan bâan"],
  en: "Last night I went to bed late because I had to do homework.",
  less: 16,
  answers: [
    ["เมื่อคืน", "ฉัน", "นอน", "ดึก", "เพราะ", "ต้อง", "ทำการบ้าน"],
    ["ฉัน", "นอน", "ดึก", "เมื่อคืน", "เพราะ", "ต้อง", "ทำการบ้าน"]
  ],
  traps: { th: ["เพื่อ", "ต้องการ"], rom: ["pêua", "dtông gaan"] }
},
{
  // CHANGED (too easy: 3 tokens, 0 traps)
  th: ["เมื่อวาน", "ฝนตก", "ทั้งวัน", "เรา", "ไม่ได้", "ไป", "ไหน"],
  rom: ["mêua waan", "fŏn-dtòk", "táng wan", "rao", "mâi dâai", "bpai", "năi"],
  en: "It rained all day yesterday. We didn't go anywhere.",
  less: 16,
  answers: [
    ["เมื่อวาน", "ฝนตก", "ทั้งวัน", "เรา", "ไม่ได้", "ไป", "ไหน"],
    ["ฝนตก", "ทั้งวัน", "เมื่อวาน", "เรา", "ไม่ได้", "ไป", "ไหน"]
  ],
  traps: { th: ["คืนนี้"], rom: ["keun née"] }
},
{
  // CHANGED (too easy: 5 tokens, 0 traps)
  th: ["อาทิตย์", "ที่แล้ว", "ผม", "ไม่", "สบาย", "ผม", "ไม่ได้", "ไป", "ทำงาน", "สาม", "วัน"],
  rom: ["aa-tít", "têe láew", "pŏm", "mâi", "sà-baai", "pŏm", "mâi dâai", "bpai", "tam ngaan", "săam", "wan"],
  en: "Last week I was sick. I didn't go to work for three days.",
  less: 16,
  answers: [
    ["อาทิตย์", "ที่แล้ว", "ผม", "ไม่", "สบาย", "ผม", "ไม่ได้", "ไป", "ทำงาน", "สาม", "วัน"],
    ["ผม", "ไม่", "สบาย", "อาทิตย์", "ที่แล้ว", "ผม", "ไม่ได้", "ไป", "ทำงาน", "สาม", "วัน"]
  ],
  traps: { th: ["หน้า"], rom: ["nâa"] }
},
{
  th: ["สาม", "เดือน", "ที่แล้ว", "ผม", "เริ่ม", "เรียน", "ภาษา", "ไทย"],
  rom: ["săam", "deuan", "têe láew", "pŏm", "rêrm", "rian", "paa-săa", "Thai"],
  en: "Three months ago I started learning Thai.",
  less: 16,
  answers: [  // ADDED answers
    ["สาม", "เดือน", "ที่แล้ว", "ผม", "เริ่ม", "เรียน", "ภาษา", "ไทย"],
    ["ผม", "เริ่ม", "เรียน", "ภาษา", "ไทย", "สาม", "เดือน", "ที่แล้ว"]
  ],
  traps: { th: ["หน้า", "เคย"], rom: ["nâa", "koie"] }  // ADDED traps
},
{
  // CHANGED (6 tokens, 0 traps) — extended
  th: ["เมื่อคืน", "ฉัน", "กับ", "เพื่อนๆ", "กิน", "เยอะ", "มาก", "วันนี้", "ปวดท้อง"],
  rom: ["mêua keun", "chăn", "gàp", "pêuan pêuan", "gin", "yúh", "mâak", "wan née", "bpùat tóng"],
  en: "Last night my friends and I ate a lot. Today I have a stomach ache.",
  less: 16,
  traps: { th: ["คืนนี้"], rom: ["keun née"] }
},
{
  // CHANGED (too easy: 5 tokens, 0 traps) — now also practises ไป…มา
  th: ["วันศุกร์", "ที่แล้ว", "พวกเรา", "ไป", "ทะเล", "มา", "อากาศ", "ดี", "มาก"],
  rom: ["wan sùk", "têe láew", "pûak rao", "bpai", "tá-lay", "maa", "aa-gàat", "dee", "mâak"],
  en: "Last Friday we went to the sea. The weather was great.",
  less: 16,
  answers: [
    ["วันศุกร์", "ที่แล้ว", "พวกเรา", "ไป", "ทะเล", "มา", "อากาศ", "ดี", "มาก"],
    ["พวกเรา", "ไป", "ทะเล", "มา", "วันศุกร์", "ที่แล้ว", "อากาศ", "ดี", "มาก"]
  ],
  traps: { th: ["หน้า", "จะ"], rom: ["nâa", "jà"] }
},
{
  th: ["ผม", "ซื้อ", "รถยนต์", "คัน", "นี้", "สอง", "ปี", "ที่แล้ว"],
  rom: ["pŏm", "séu", "rót yon", "kan", "née", "sŏng", "bpee", "têe láew"],
  en: "I bought this car two years ago.",
  less: 16,
  answers: [  // ADDED answers
    ["ผม", "ซื้อ", "รถยนต์", "คัน", "นี้", "สอง", "ปี", "ที่แล้ว"],
    ["สอง", "ปี", "ที่แล้ว", "ผม", "ซื้อ", "รถยนต์", "คัน", "นี้"]
  ],
  traps: { th: ["ตัว", "หน้า"], rom: ["dtua", "nâa"] }  // ADDED traps
},
{
  // CHANGED (6 tokens, 0 traps) — extended
  th: ["ผม", "ไป", "ภูเก็ต", "กับ", "แฟน", "มา", "สนุก", "มาก"],
  rom: ["pŏm", "bpai", "poo-gèt", "gàp", "faen", "maa", "sà-nùk", "mâak"],
  en: "I went to Phuket with my girlfriend. It was so much fun.",
  less: 16,
  traps: { th: ["และ", "ที่แล้ว"], rom: ["láe", "têe láew"] }
},
{
  th: ["อาทิตย์", "ที่แล้ว", "เรา", "ไป", "เวียดนาม", "มา"],
  rom: ["aa-tít", "têe láew", "rao", "bpai", "wîat-naam", "maa"],
  en: "Last week we went to Vietnam. (and came back)",
  less: 16,
  answers: [  // ADDED answers
    ["อาทิตย์", "ที่แล้ว", "เรา", "ไป", "เวียดนาม", "มา"],
    ["เรา", "ไป", "เวียดนาม", "มา", "อาทิตย์", "ที่แล้ว"]
  ],
  traps: { th: ["หน้า", "จะ"], rom: ["nâa", "jà"] }  // ADDED traps
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["เมื่อวาน", "แม่", "ไป", "โรงพยาบาล", "มา", "เพราะ", "ปวดหัว", "ทั้งคืน"],
  rom: ["mêua waan", "mâe", "bpai", "rohng pá-yaa-baan", "maa", "prór", "bpùat hŭa", "táng keun"],
  en: "Yesterday mom went to the hospital because she had a headache all night.",
  less: 16,
  answers: [
    ["เมื่อวาน", "แม่", "ไป", "โรงพยาบาล", "มา", "เพราะ", "ปวดหัว", "ทั้งคืน"],
    ["แม่", "ไป", "โรงพยาบาล", "มา", "เมื่อวาน", "เพราะ", "ปวดหัว", "ทั้งคืน"]
  ],
  traps: { th: ["พรุ่งนี้", "จะ"], rom: ["prûng-née", "jà"] }
},
{
  th: ["เมื่อเช้านี้", "ผม", "ไป", "กิน", "ข้าว", "กับ", "เพื่อนๆ", "มา"],
  rom: ["mêua cháo née", "pŏm", "bpai", "gin", "kâao", "gàp", "pêuan pêuan", "maa"],
  en: "This morning I went out to eat with my friends. (and came back)",  // FIXED typo "with a friends"
  less: 16,
  answers: [  // ADDED answers
    ["เมื่อเช้านี้", "ผม", "ไป", "กิน", "ข้าว", "กับ", "เพื่อนๆ", "มา"],
    ["ผม", "ไป", "กิน", "ข้าว", "กับ", "เพื่อนๆ", "มา", "เมื่อเช้านี้"]
  ],
  traps: { th: ["พรุ่งนี้", "จะ"], rom: ["prûng-née", "jà"] }  // ADDED traps
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["ฉัน", "กลับบ้าน", "แล้ว", "พรุ่งนี้", "เจอ", "กัน", "นะ"],
  rom: ["chăn", "glàp bâan", "láew", "prûng-née", "jer", "gan", "ná"],
  en: "I've already gone home. See you tomorrow!",
  less: 16,
  answers: [
    ["ฉัน", "กลับบ้าน", "แล้ว", "พรุ่งนี้", "เจอ", "กัน", "นะ"],
    ["ฉัน", "กลับบ้าน", "แล้ว", "เจอ", "กัน", "พรุ่งนี้", "นะ"]
  ],
  traps: { th: ["เมื่อวาน"], rom: ["mêua waan"] }
},
{
  // CHANGED (too easy: 5 tokens, 0 traps)
  th: ["วันนี้", "ผม", "กิน", "ของหวาน", "แล้ว", "ผม", "ไม่", "อยาก", "อ้วน"],
  rom: ["wan née", "pŏm", "gin", "kŏng wăan", "láew", "pŏm", "mâi", "yàak", "ûan"],
  en: "I already had dessert today. I don't want to get fat.",
  less: 16,
  traps: { th: ["อยากได้", "ผอม"], rom: ["yàak dâai", "pŏom"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["ไม่", "ต้อง", "จ่าย", "นะ", "ผม", "จ่าย", "แล้ว"],
  rom: ["mâi", "dtông", "jàai", "ná", "pŏm", "jàai", "láew"],
  en: "You don't have to pay. I've already paid.",
  less: 16,
  answers: [
    ["ไม่", "ต้อง", "จ่าย", "นะ", "ผม", "จ่าย", "แล้ว"],
    ["ผม", "จ่าย", "แล้ว", "ไม่", "ต้อง", "จ่าย", "นะ"]
  ],
  traps: { th: ["ไม่ได้"], rom: ["mâi dâai"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["ฉัน", "บอก", "คุณ", "แล้ว", "ว่า", "ร้าน", "นี้", "แพง", "มาก"],
  rom: ["chăn", "bòk", "kun", "láew", "wâa", "ráan", "née", "paeng", "mâak"],
  en: "I already told you this restaurant is very expensive.",
  less: 16,
  traps: { th: ["พูด", "นี่"], rom: ["pôot", "nêe"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["พ่อ", "เลิก", "สูบบุหรี่", "แล้ว", "ตอนนี้", "พ่อ", "แข็งแรง", "มาก"],
  rom: ["pôr", "lêrk", "sòop bù-rèe", "láew", "dton-née", "pôr", "kăeng raeng", "mâak"],
  en: "Dad quit smoking. Now he's very healthy.",
  less: 16,
  traps: { th: ["เสร็จ"], rom: ["sèt"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["ปี", "ที่แล้ว", "ผม", "อ้วน", "มาก", "แต่", "ตอนนี้", "ผม", "ไม่", "อ้วน", "แล้ว"],
  rom: ["bpee", "têe láew", "pŏm", "ûan", "mâak", "dtàe", "dton-née", "pŏm", "mâi", "ûan", "láew"],
  en: "Last year I was very fat, but now I'm not fat anymore.",
  less: 16,
  answers: [
    ["ปี", "ที่แล้ว", "ผม", "อ้วน", "มาก", "แต่", "ตอนนี้", "ผม", "ไม่", "อ้วน", "แล้ว"],
    ["ผม", "อ้วน", "มาก", "ปี", "ที่แล้ว", "แต่", "ตอนนี้", "ผม", "ไม่", "อ้วน", "แล้ว"]
  ],
  traps: { th: ["ยัง", "หน้า"], rom: ["yang", "nâa"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps) — uses หนู (child speaking)
  th: ["หนู", "ทำการบ้าน", "เสร็จ", "แล้ว", "ไป", "เล่น", "เกม", "ได้", "ไหม"],
  rom: ["nŏo", "tam gaan bâan", "sèt", "láew", "bpai", "lên", "gem", "dâai", "măi"],
  en: "I've finished my homework. Can I go play games? (child speaking)",
  less: 16,
  traps: { th: ["เลิก"], rom: ["lêrk"] }
},
{
  // CHANGED (too easy: 4 tokens; merged with the near-identical "I didn't eat breakfast")
  th: ["เมื่อเช้านี้", "ผม", "ไม่ได้", "กิน", "อาหารเช้า", "ตอนนี้", "หิว", "มาก"],
  rom: ["mêua cháo née", "pŏm", "mâi dâai", "gin", "aa-hăan cháo", "dton-née", "hĭw", "mâak"],
  en: "I didn't eat breakfast this morning. Now I'm very hungry.",
  less: 16,
  traps: { th: ["เคย", "พรุ่งนี้"], rom: ["koie", "prûng-née"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["เมื่อคืน", "ผม", "ไม่ได้", "ไป", "ปาร์ตี้", "เพราะ", "ต้อง", "ทำงาน", "ดึก"],
  rom: ["mêua keun", "pŏm", "mâi dâai", "bpai", "bpaa-dtêe", "prór", "dtông", "tam ngaan", "dèuk"],
  en: "Last night I didn't go to the party because I had to work late.",
  less: 16,
  answers: [
    ["เมื่อคืน", "ผม", "ไม่ได้", "ไป", "ปาร์ตี้", "เพราะ", "ต้อง", "ทำงาน", "ดึก"],
    ["ผม", "ไม่ได้", "ไป", "ปาร์ตี้", "เมื่อคืน", "เพราะ", "ต้อง", "ทำงาน", "ดึก"]
  ],
  traps: { th: ["ต้องการ", "เพื่อ"], rom: ["dtông gaan", "pêua"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["เมื่อวาน", "ฉัน", "ไม่ได้", "ทำงาน", "ฉัน", "ไปเที่ยว", "กับ", "เพื่อน", "มา"],
  rom: ["mêua waan", "chăn", "mâi dâai", "tam ngaan", "chăn", "bpai tîeow", "gàp", "pêuan", "maa"],
  en: "Yesterday I didn't work. I went out with my friends.",
  less: 16,
  answers: [
    ["เมื่อวาน", "ฉัน", "ไม่ได้", "ทำงาน", "ฉัน", "ไปเที่ยว", "กับ", "เพื่อน", "มา"],
    ["ฉัน", "ไม่ได้", "ทำงาน", "เมื่อวาน", "ฉัน", "ไปเที่ยว", "กับ", "เพื่อน", "มา"]
  ],
  traps: { th: ["พรุ่งนี้", "และ"], rom: ["prûng-née", "láe"] }
},
{
  // CHANGED (was "I didn't eat breakfast", merged into the sentence above)
  th: ["เมื่อวาน", "ผม", "ไม่ได้", "ไป", "ออกกำลังกาย", "เพราะ", "ฝนตก"],
  rom: ["mêua waan", "pŏm", "mâi dâai", "bpai", "òk gam-lang gaai", "prór", "fŏn-dtòk"],
  en: "Yesterday I didn't go work out because it rained.",
  less: 16,
  answers: [
    ["เมื่อวาน", "ผม", "ไม่ได้", "ไป", "ออกกำลังกาย", "เพราะ", "ฝนตก"],
    ["ผม", "ไม่ได้", "ไป", "ออกกำลังกาย", "เมื่อวาน", "เพราะ", "ฝนตก"]
  ],
  traps: { th: ["ไม่เคย", "เพื่อ"], rom: ["mâi koie", "pêua"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps) — เคย vs ไม่เคย in one sentence
  th: ["ผม", "เคย", "ไป", "ญี่ปุ่น", "สอง", "ครั้ง", "แต่", "ไม่เคย", "ไป", "จีน"],
  rom: ["pŏm", "koie", "bpai", "yêe-bpùn", "sŏng", "kráng", "dtàe", "mâi koie", "bpai", "jeen"],
  en: "I've been to Japan twice, but I've never been to China.",
  less: 16,
  traps: { th: ["ที่แล้ว"], rom: ["têe láew"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps) — uses ครั้งแรก
  th: ["ฉัน", "กิน", "ทุเรียน", "ครั้งแรก", "เมื่อวาน", "อร่อย", "มาก"],
  rom: ["chăn", "gin", "tú-rian", "kráng râek", "mêua waan", "à-ròi", "mâak"],
  en: "I ate durian for the first time yesterday. It was very tasty.",
  less: 16,
  answers: [
    ["ฉัน", "กิน", "ทุเรียน", "ครั้งแรก", "เมื่อวาน", "อร่อย", "มาก"],
    ["เมื่อวาน", "ฉัน", "กิน", "ทุเรียน", "ครั้งแรก", "อร่อย", "มาก"]
  ],
  traps: { th: ["เคย", "พรุ่งนี้"], rom: ["koie", "prûng-née"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["ผม", "ไม่เคย", "ไป", "เชียงใหม่", "แต่", "อยาก", "ไป", "มาก"],
  rom: ["pŏm", "mâi koie", "bpai", "chiang-mài", "dtàe", "yàak", "bpai", "mâak"],
  en: "I've never been to Chiang Mai, but I really want to go.",
  less: 16,
  traps: { th: ["ไม่ได้", "อยากได้"], rom: ["mâi dâai", "yàak dâai"] }
},
{
  // CHANGED (5 tokens, 0 traps) — question + answer
  th: ["คุณ", "เคย", "ทำ", "อาหารไทย", "ไหม", "ผม", "ไม่เคย", "ทำ", "เลย"],
  rom: ["kun", "koie", "tam", "aa-hăan Thai", "măi", "pŏm", "mâi koie", "tam", "loie"],
  en: "Have you ever cooked Thai food? I've never cooked it at all.",
  less: 16,
  traps: { th: ["ครั้งแรก"], rom: ["kráng râek"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps) — uses อีก … จะเสร็จ from the vocab
  th: ["ผม", "ยัง", "ทำงาน", "อยู่", "อีก", "หนึ่ง", "ชั่วโมง", "จะ", "เสร็จ"],
  rom: ["pŏm", "yang", "tam ngaan", "yòo", "èek", "nèung", "chûa-mohng", "jà", "sèt"],
  en: "I'm still working. I'll be done in an hour.",
  less: 16,
  traps: { th: ["แล้ว", "เคย"], rom: ["láew", "koie"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["เรา", "รอ", "เขา", "สามสิบ", "นาที", "แล้ว", "แต่", "เขา", "ยัง", "ไม่", "มา"],
  rom: ["rao", "ror", "kăo", "săam-sìp", "naa-tee", "láew", "dtàe", "kăo", "yang", "mâi", "maa"],
  en: "We've waited for him for thirty minutes, but he still hasn't come.",
  less: 16,
  traps: { th: ["เคย"], rom: ["koie"] }
},
{
  // CHANGED (too easy: 5 tokens, 0 traps)
  th: ["พวกเรา", "กำลัง", "กิน", "ข้าว", "อยู่", "เดี๋ยว", "โทรหา", "คุณ", "นะ"],
  rom: ["pûak rao", "gam-lang", "gin", "kâao", "yòo", "dĭeow", "toh hăa", "kun", "ná"],
  en: "We're eating right now. I'll call you in a bit.",
  less: 16,
  traps: { th: ["เคย"], rom: ["koie"] }
},
{
  // CHANGED (too easy: 5 tokens, 0 traps) — น่ากลัว vs กลัว trap
  th: ["เมื่อคืน", "เรา", "ดู", "หนัง", "ด้วยกัน", "หนัง", "น่ากลัว", "มาก"],
  rom: ["mêua keun", "rao", "doo", "năng", "dûay gan", "năng", "nâa glua", "mâak"],
  en: "Last night we watched a movie together. The movie was very scary.",
  less: 16,
  answers: [
    ["เมื่อคืน", "เรา", "ดู", "หนัง", "ด้วยกัน", "หนัง", "น่ากลัว", "มาก"],
    ["เรา", "ดู", "หนัง", "ด้วยกัน", "เมื่อคืน", "หนัง", "น่ากลัว", "มาก"]
  ],
  traps: { th: ["กลัว"], rom: ["glua"] }
},
{
  // CHANGED (too easy: 5 tokens, 0 traps) — ไป…มา + duration
  th: ["อาทิตย์", "ที่แล้ว", "พวกเขา", "ไป", "ไต้หวัน", "มา", "ห้า", "วัน"],
  rom: ["aa-tít", "têe láew", "pûak kăo", "bpai", "tâi-wăn", "maa", "hâa", "wan"],
  en: "Last week they went to Taiwan for five days.",
  less: 16,
  traps: { th: ["หน้า", "หา"], rom: ["nâa", "hăa"] }
},
{
  // CHANGED (6 tokens, 0 traps) — extended with รู้สึก
  th: ["สอง", "เดือน", "ที่แล้ว", "ผม", "เริ่ม", "ออกกำลังกาย", "ตอนนี้", "ผม", "รู้สึก", "ดี", "มาก"],
  rom: ["sŏng", "deuan", "têe láew", "pŏm", "rêrm", "òk gam-lang gaai", "dton-née", "pŏm", "róo sèuk", "dee", "mâak"],
  en: "Two months ago I started exercising. Now I feel great.",
  less: 16,
  answers: [
    ["สอง", "เดือน", "ที่แล้ว", "ผม", "เริ่ม", "ออกกำลังกาย", "ตอนนี้", "ผม", "รู้สึก", "ดี", "มาก"],
    ["ผม", "เริ่ม", "ออกกำลังกาย", "สอง", "เดือน", "ที่แล้ว", "ตอนนี้", "ผม", "รู้สึก", "ดี", "มาก"]
  ],
  traps: { th: ["หน้า"], rom: ["nâa"] }
},
{
  // CHANGED (5 tokens, 0 traps) — extended
  th: ["เมื่อวาน", "เธอ", "ทำ", "อะไร", "อะ", "ฉัน", "โทรหา", "เธอ", "สาม", "ครั้ง"],
  rom: ["mêua waan", "ter", "tam", "à-rai", "à", "chăn", "toh hăa", "ter", "săam", "kráng"],
  en: "What did you do yesterday? I called you three times! (informal)",
  less: 16,
  answers: [
    ["เมื่อวาน", "เธอ", "ทำ", "อะไร", "อะ", "ฉัน", "โทรหา", "เธอ", "สาม", "ครั้ง"],
    ["เธอ", "ทำ", "อะไร", "เมื่อวาน", "อะ", "ฉัน", "โทรหา", "เธอ", "สาม", "ครั้ง"]
  ],
  traps: { th: ["คน", "ครั้งแรก"], rom: ["kon", "kráng râek"] }
},
{
  // CHANGED (too easy: 3 tokens; "it rained all night" was a copy of "it rained all day")
  th: ["เมื่อคืน", "น้องชาย", "เล่น", "เกม", "ทั้งคืน", "และ", "ไม่ได้", "นอน"],
  rom: ["mêua keun", "nóng chaai", "lên", "gem", "táng keun", "láe", "mâi dâai", "non"],
  en: "Last night my younger brother played games all night and didn't sleep.",
  less: 16,
  traps: { th: ["ทั้งวัน"], rom: ["táng wan"] }
},
{
  th: ["สอง", "อาทิตย์", "ที่แล้ว", "ผม", "ซื้อ", "โทรศัพท์", "ใหม่"],
  rom: ["sŏng", "aa-tít", "têe láew", "pŏm", "séu", "toh-rá-sàp", "mài"],
  en: "Two weeks ago I bought a new phone.",
  less: 16,
  answers: [  // ADDED answers
    ["สอง", "อาทิตย์", "ที่แล้ว", "ผม", "ซื้อ", "โทรศัพท์", "ใหม่"],
    ["ผม", "ซื้อ", "โทรศัพท์", "ใหม่", "สอง", "อาทิตย์", "ที่แล้ว"]
  ],
  traps: { th: ["หน้า", "เคย"], rom: ["nâa", "koie"] }  // ADDED traps
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["ปี", "ที่แล้ว", "พวกเรา", "ไป", "สิงคโปร์", "มา", "แต่", "ไม่", "ชอบ", "เพราะ", "แพง", "มาก"],
  rom: ["bpee", "têe láew", "pûak rao", "bpai", "sĭng-ká-poh", "maa", "dtàe", "mâi", "chôp", "prór", "paeng", "mâak"],
  en: "Last year we went to Singapore, but we didn't like it because it was very expensive.",
  less: 16,
  answers: [
    ["ปี", "ที่แล้ว", "พวกเรา", "ไป", "สิงคโปร์", "มา", "แต่", "ไม่", "ชอบ", "เพราะ", "แพง", "มาก"],
    ["พวกเรา", "ไป", "สิงคโปร์", "มา", "ปี", "ที่แล้ว", "แต่", "ไม่", "ชอบ", "เพราะ", "แพง", "มาก"]
  ],
  traps: { th: ["หน้า"], rom: ["nâa"] }
},
{
  // CHANGED (too easy: 5 tokens, 0 traps)
  th: ["เมื่อเช้านี้", "ผม", "ไป", "ตลาด", "มา", "ซื้อ", "ผลไม้", "เยอะ", "มาก"],
  rom: ["mêua cháo née", "pŏm", "bpai", "dtà-làat", "maa", "séu", "pŏn-lá-mái", "yúh", "mâak"],
  en: "This morning I went to the market and bought a lot of fruit.",
  less: 16,
  answers: [
    ["เมื่อเช้านี้", "ผม", "ไป", "ตลาด", "มา", "ซื้อ", "ผลไม้", "เยอะ", "มาก"],
    ["ผม", "ไป", "ตลาด", "มา", "เมื่อเช้านี้", "ซื้อ", "ผลไม้", "เยอะ", "มาก"]
  ],
  traps: { th: ["พรุ่งนี้"], rom: ["prûng-née"] }
},
{
  // CHANGED (5 tokens, 0 traps; near-copy of "Yesterday I went to see the doctor") — uses อาหารเป็นพิษ
  th: ["เขา", "ไป", "หา", "หมอ", "มา", "หมอ", "บอก", "ว่า", "เขา", "เป็น", "อาหารเป็นพิษ"],
  rom: ["kăo", "bpai", "hăa", "mŏr", "maa", "mŏr", "bòk", "wâa", "kăo", "bpen", "aa-hăan bpen pít"],
  en: "He went to see the doctor. The doctor said he has food poisoning.",
  less: 16,
  traps: { th: ["ห้า", "คือ"], rom: ["hâa", "keu"] }
},
{
  // CHANGED (5 tokens, 0 traps; 3 other "went to the sea" sentences) — uses ถ่ายรูป
  th: ["เดือน", "ที่แล้ว", "พวกเขา", "ไป", "เที่ยว", "ญี่ปุ่น", "มา", "ถ่ายรูป", "เยอะ", "มาก"],
  rom: ["deuan", "têe láew", "pûak kăo", "bpai", "tîeow", "yêe-bpùn", "maa", "tàai rôop", "yúh", "mâak"],
  en: "Last month they went on a trip to Japan and took lots of photos.",
  less: 16,
  answers: [
    ["เดือน", "ที่แล้ว", "พวกเขา", "ไป", "เที่ยว", "ญี่ปุ่น", "มา", "ถ่ายรูป", "เยอะ", "มาก"],
    ["พวกเขา", "ไป", "เที่ยว", "ญี่ปุ่น", "มา", "เดือน", "ที่แล้ว", "ถ่ายรูป", "เยอะ", "มาก"]
  ],
  traps: { th: ["หน้า", "ยุ่ง"], rom: ["nâa", "yûng"] }
},
{
  // CHANGED (too easy: 3 tokens, 0 traps) — แล้ว vs ยังไม่ได้
  th: ["ผม", "อาบน้ำ", "แล้ว", "แต่", "ยัง", "ไม่ได้", "กิน", "ข้าว"],
  rom: ["pŏm", "àap náam", "láew", "dtàe", "yang", "mâi dâai", "gin", "kâao"],
  en: "I've already showered, but I haven't eaten yet.",
  less: 16,
  traps: { th: ["เคย", "กำลัง"], rom: ["koie", "gam-lang"] }
},
{
  // CHANGED (too easy: 5 tokens, 0 traps) — uses กันเถอะ
  th: ["เรา", "กิน", "ข้าว", "เสร็จ", "แล้ว", "ไป", "ดู", "หนัง", "กันเถอะ"],
  rom: ["rao", "gin", "kâao", "sèt", "láew", "bpai", "doo", "năng", "gan tùh"],
  en: "We've finished eating. Let's go watch a movie!",
  less: 16,
  traps: { th: ["เลิก"], rom: ["lêrk"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps) — uses เจอกันอีก … นาที from the vocab
  th: ["พี่", "เลิก", "งาน", "แล้ว", "เจอ", "กัน", "อีก", "สามสิบ", "นาที", "นะ"],
  rom: ["pêe", "lêrk", "ngaan", "láew", "jer", "gan", "èek", "săam-sìp", "naa-tee", "ná"],
  en: "I've finished work. See you in 30 minutes. (older speaker)",
  less: 16,
  traps: { th: ["ชั่วโมง", "ที่แล้ว"], rom: ["chûa-mohng", "têe láew"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["ขอบคุณ", "ครับ", "ผม", "ไม่", "หิว", "แล้ว", "ผม", "กิน", "เยอะ", "แล้ว"],
  rom: ["kòp kun", "kráp", "pŏm", "mâi", "hĭw", "láew", "pŏm", "gin", "yúh", "láew"],
  en: "Thank you, I'm not hungry anymore. I've already eaten a lot.",
  less: 16,
  answers: [
    ["ขอบคุณ", "ครับ", "ผม", "ไม่", "หิว", "แล้ว", "ผม", "กิน", "เยอะ", "แล้ว"],
    ["ขอบคุณ", "ครับ", "ผม", "กิน", "เยอะ", "แล้ว", "ผม", "ไม่", "หิว", "แล้ว"]
  ],
  traps: { th: ["ยัง", "เคย"], rom: ["yang", "koie"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["เธอ", "ตื่น", "แล้ว", "เหรอ", "เมื่อคืน", "เธอ", "นอน", "ดึก", "มาก"],
  rom: ["ter", "dtèun", "láew", "rŏr", "mêua keun", "ter", "non", "dèuk", "mâak"],
  en: "Oh, you're already awake? You went to bed really late last night. (informal)",
  less: 16,
  traps: { th: ["ไหม", "คืนนี้"], rom: ["măi", "keun née"] }
},
{
  // CHANGED: "น้องไม่สบายแล้ว" is confusing in a lesson that teaches ไม่…แล้ว = "not anymore"
  th: ["เมื่อวาน", "น้อง", "ไม่", "สบาย", "แต่", "วันนี้", "หาย", "แล้ว"],
  rom: ["mêua waan", "nóng", "mâi", "sà-baai", "dtàe", "wan née", "hăai", "láew"],
  en: "Yesterday my younger sibling was sick, but today they're better.",
  less: 16,
  traps: { th: ["พรุ่งนี้", "หา"], rom: ["prûng-née", "hăa"] }
},
{
  // CHANGED (5 tokens, 0 traps; overlapped the new "played games all night and didn't sleep")
  th: ["เมื่อคืน", "ผม", "นอน", "ประมาณ", "สาม", "ชั่วโมง", "ตอนนี้", "ง่วง", "มาก"],
  rom: ["mêua keun", "pŏm", "non", "bprà-maan", "săam", "chûa-mohng", "dton-née", "ngûang", "mâak"],
  en: "Last night I slept about three hours. Now I'm very sleepy.",
  less: 16,
  traps: { th: ["นาที"], rom: ["naa-tee"] }
},
{
  // CHANGED (5 tokens, 0 traps; 3 other "didn't … because …" sentences) — หรือยัง vs ไหม trap
  th: ["คุณ", "อ่าน", "หนังสือ", "เสร็จ", "แล้ว", "หรือยัง", "ฉัน", "ยัง", "ไม่ได้", "อ่าน", "เลย"],
  rom: ["kun", "àan", "năng-sĕu", "sèt", "láew", "rĕu yang", "chăn", "yang", "mâi dâai", "àan", "loie"],
  en: "Have you finished reading the book yet? I haven't even read it.",
  less: 16,
  traps: { th: ["ไหม", "เคย"], rom: ["măi", "koie"] }
},
{
  // CHANGED: "ไม่ได้เจอกันนาน" needs แล้ว to sound natural; ไม่ + ได้ merged into one token
  th: ["เรา", "ไม่ได้", "เจอ", "กัน", "นาน", "แล้ว", "คิดถึง", "มาก"],
  rom: ["rao", "mâi dâai", "jer", "gan", "naan", "láew", "kít tĕung", "mâak"],
  en: "We haven't seen each other in a long time. I miss you so much.",
  less: 16,
  traps: { th: ["ไม่เคย", "ยัง"], rom: ["mâi koie", "yang"] }
},
{
  // CHANGED (6 tokens, 0 traps) — extended; ไม่ + ได้ merged into one token
  th: ["ทำไม", "เมื่อคืน", "เธอ", "ไม่ได้", "มา", "ปาร์ตี้", "อะ"],
  rom: ["tam-mai", "mêua keun", "ter", "mâi dâai", "maa", "bpaa-dtêe", "à"],
  en: "Why didn't you come to the party last night? (informal)",
  less: 16,
  answers: [
    ["ทำไม", "เมื่อคืน", "เธอ", "ไม่ได้", "มา", "ปาร์ตี้", "อะ"],
    ["เมื่อคืน", "ทำไม", "เธอ", "ไม่ได้", "มา", "ปาร์ตี้", "อะ"],
    ["ทำไม", "เธอ", "ไม่ได้", "มา", "ปาร์ตี้", "เมื่อคืน", "อะ"]
  ],
  traps: { th: ["ไม่เคย"], rom: ["mâi koie"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps; the Taiwan trip is already in part 1)
  th: ["คุณ", "เคย", "ไป", "ภูเก็ต", "กี่", "ครั้ง", "แล้ว"],
  rom: ["kun", "koie", "bpai", "poo-gèt", "gèe", "kráng", "láew"],
  en: "How many times have you been to Phuket?",
  less: 16,
  traps: { th: ["คน", "เท่าไหร่"], rom: ["kon", "tâo rài"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps; part 1 has "ate durian for the first time")
  th: ["ภรรยา", "ของ", "ผม", "ชอบ", "ทุเรียน", "มาก", "แต่", "ผม", "ไม่เคย", "กิน", "เลย"],
  rom: ["pan-rá-yaa", "kŏng", "pŏm", "chôp", "tú-rian", "mâak", "dtàe", "pŏm", "mâi koie", "gin", "loie"],
  en: "My wife loves durian, but I've never eaten it.",
  less: 16,
  traps: { th: ["เคย", "ยัง"], rom: ["koie", "yang"] }
},
{
  // CHANGED (5 tokens, 0 traps; part 1 has a Singapore trip) — question + answer
  th: ["คุณ", "เคย", "ไป", "ยุโรป", "ไหม", "ฉัน", "ไป", "มา", "เดือน", "ที่แล้ว"],
  rom: ["kun", "koie", "bpai", "yú-ròhp", "măi", "chăn", "bpai", "maa", "deuan", "têe láew"],
  en: "Have you ever been to Europe? I went there last month.",
  less: 16,
  answers: [
    ["คุณ", "เคย", "ไป", "ยุโรป", "ไหม", "ฉัน", "ไป", "มา", "เดือน", "ที่แล้ว"],
    ["คุณ", "เคย", "ไป", "ยุโรป", "ไหม", "เดือน", "ที่แล้ว", "ฉัน", "ไป", "มา"]
  ],
  traps: { th: ["หน้า", "จะ"], rom: ["nâa", "jà"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["เรา", "เคย", "ลอง", "นวดไทย", "ที่", "กรุงเทพ", "สบาย", "มาก"],
  rom: ["rao", "koie", "long", "nûat thai", "têe", "grung têp", "sà-baai", "mâak"],
  en: "We've tried Thai massage in Bangkok. It was very relaxing.",
  less: 16,
  traps: { th: ["ยัง", "และ"], rom: ["yang", "láe"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps) — แล้ว vs ยัง…อยู่
  th: ["แม่", "ตื่น", "แล้ว", "แต่", "ลูกชาย", "ยัง", "นอน", "อยู่"],
  rom: ["mâe", "dtèun", "láew", "dtàe", "lôok chaai", "yang", "non", "yòo"],
  en: "Mom is already up, but my son is still sleeping.",
  less: 16,
  traps: { th: ["เคย", "เสร็จ"], rom: ["koie", "sèt"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["ร้าน", "ยัง", "ไม่", "เปิด", "เรา", "รอ", "อีก", "สิบ", "นาที", "นะ"],
  rom: ["ráan", "yang", "mâi", "bpèrt", "rao", "ror", "èek", "sìp", "naa-tee", "ná"],
  en: "The shop isn't open yet. Let's wait ten more minutes.",
  less: 16,
  traps: { th: ["ที่แล้ว", "เคย"], rom: ["têe láew", "koie"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps; near-copy of "We're eating right now" in part 1)
  th: ["ตอนนี้", "แม่", "กำลัง", "ทำความสะอาดบ้าน", "และ", "พ่อ", "กำลัง", "ทำอาหาร", "อยู่"],
  rom: ["dton-née", "mâe", "gam-lang", "tam kwaam sà-àat bâan", "láe", "pôr", "gam-lang", "tam aa-hăan", "yòo"],
  en: "Right now mom is cleaning the house, and dad is cooking.",
  less: 16,
  answers: [
    ["ตอนนี้", "แม่", "กำลัง", "ทำความสะอาดบ้าน", "และ", "พ่อ", "กำลัง", "ทำอาหาร", "อยู่"],
    ["ตอนนี้", "แม่", "กำลัง", "ทำความสะอาดบ้าน", "อยู่", "และ", "พ่อ", "กำลัง", "ทำอาหาร"],
    ["ตอนนี้", "พ่อ", "กำลัง", "ทำอาหาร", "และ", "แม่", "กำลัง", "ทำความสะอาดบ้าน", "อยู่"],
    ["ตอนนี้", "พ่อ", "กำลัง", "ทำอาหาร", "อยู่", "และ", "แม่", "กำลัง", "ทำความสะอาดบ้าน"]
  ],
  traps: { th: ["กับ", "ที่แล้ว"], rom: ["gàp", "têe láew"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["ฉัน", "กิน", "ข้าว", "แล้ว", "แต่", "ยัง", "หิว", "อยู่"],
  rom: ["chăn", "gin", "kâao", "láew", "dtàe", "yang", "hĭw", "yòo"],
  en: "I've already eaten, but I'm still hungry.",
  less: 16,
  traps: { th: ["เคย", "จะ"], rom: ["koie", "jà"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps) — question + answer
  th: ["เธอ", "กิน", "ข้าว", "หรือยัง", "ยัง", "เลย", "หิว", "มาก"],
  rom: ["ter", "gin", "kâao", "rĕu yang", "yang", "loie", "hĭw", "mâak"],
  en: "Have you eaten yet? — Not yet, I'm so hungry! (informal)",
  less: 16,
  traps: { th: ["เคย"], rom: ["koie"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["พ่อ", "กำลัง", "ขับรถ", "อยู่", "คุย", "ไม่", "ได้", "นะ"],
  rom: ["pôr", "gam-lang", "kàp rót", "yòo", "kui", "mâi", "dâai", "ná"],
  en: "Dad is driving right now. He can't talk.",
  less: 16,
  traps: { th: ["เคย", "ไม่ได้"], rom: ["koie", "mâi dâai"] }
},
{
  // CHANGED (5 tokens, 0 traps) — extended
  th: ["อาทิตย์", "ที่แล้ว", "พ่อ", "ป่วย", "มาก", "ต้อง", "ไป", "โรงพยาบาล"],
  rom: ["aa-tít", "têe láew", "pôr", "bpùay", "mâak", "dtông", "bpai", "rohng pá-yaa-baan"],
  en: "Last week my dad was very sick and had to go to the hospital.",
  less: 16,
  answers: [
    ["อาทิตย์", "ที่แล้ว", "พ่อ", "ป่วย", "มาก", "ต้อง", "ไป", "โรงพยาบาล"],
    ["พ่อ", "ป่วย", "มาก", "อาทิตย์", "ที่แล้ว", "ต้อง", "ไป", "โรงพยาบาล"]
  ],
  traps: { th: ["หน้า", "ต้องการ"], rom: ["nâa", "dtông gaan"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps; fever is already in part 1) — uses สองสามวันนี้ + น้ำมูกไหล
  th: ["สองสามวันนี้", "ผม", "ไอ", "และ", "น้ำมูกไหล", "แต่", "ไม่", "เป็นไข้"],
  rom: ["sŏng săam wan née", "pŏm", "ai", "láe", "náam môok lăi", "dtàe", "mâi", "bpen kâi"],
  en: "These last few days I've had a cough and a runny nose, but no fever.",
  less: 16,
  answers: [
    ["สองสามวันนี้", "ผม", "ไอ", "และ", "น้ำมูกไหล", "แต่", "ไม่", "เป็นไข้"],
    ["สองสามวันนี้", "ผม", "น้ำมูกไหล", "และ", "ไอ", "แต่", "ไม่", "เป็นไข้"]
  ],
  traps: { th: ["หวัดดี", "ใจ"], rom: ["wàt dee", "jai"] }
},
{
  // CHANGED (5 tokens, 0 traps) — uses รู้สึก + แย่
  th: ["สอง", "อาทิตย์", "ที่แล้ว", "ฉัน", "เป็นไข้", "รู้สึก", "แย่", "มาก"],
  rom: ["sŏng", "aa-tít", "têe láew", "chăn", "bpen kâi", "róo sèuk", "yâe", "mâak"],
  en: "Two weeks ago I had a fever. I felt terrible.",
  less: 16,
  answers: [
    ["สอง", "อาทิตย์", "ที่แล้ว", "ฉัน", "เป็นไข้", "รู้สึก", "แย่", "มาก"],
    ["ฉัน", "เป็นไข้", "สอง", "อาทิตย์", "ที่แล้ว", "รู้สึก", "แย่", "มาก"]
  ],
  traps: { th: ["หน้า"], rom: ["nâa"] }
},
{
  // CHANGED (5 tokens, 0 traps) — extended
  th: ["ตอนนี้", "ผม", "ปวดหัว", "และ", "เจ็บคอ", "คิด", "ว่า", "เป็นหวัด"],
  rom: ["dton-née", "pŏm", "bpùat hŭa", "láe", "jèp kor", "kít", "wâa", "bpen wàt"],
  en: "Right now I have a headache and a sore throat. I think I have a cold.",
  less: 16,
  answers: [
    ["ตอนนี้", "ผม", "ปวดหัว", "และ", "เจ็บคอ", "คิด", "ว่า", "เป็นหวัด"],
    ["ตอนนี้", "ผม", "เจ็บคอ", "และ", "ปวดหัว", "คิด", "ว่า", "เป็นหวัด"]
  ],
  traps: { th: ["หวัดดี", "คือ"], rom: ["wàt dee", "keu"] }
},
{
  // CHANGED (5 tokens, 0 traps) — extended with a cause
  th: ["เมื่อคืน", "ฉัน", "อ้วก", "และ", "ท้องเสีย", "เพราะ", "กิน", "อาหารทะเล"],
  rom: ["mêua keun", "chăn", "ûak", "láe", "tóng-sĭa", "prór", "gin", "aa hăan tá-lay"],
  en: "Last night I threw up and had diarrhea because I ate seafood.",
  less: 16,
  answers: [
    ["เมื่อคืน", "ฉัน", "อ้วก", "และ", "ท้องเสีย", "เพราะ", "กิน", "อาหารทะเล"],
    ["เมื่อคืน", "ฉัน", "ท้องเสีย", "และ", "อ้วก", "เพราะ", "กิน", "อาหารทะเล"],
    ["ฉัน", "อ้วก", "และ", "ท้องเสีย", "เมื่อคืน", "เพราะ", "กิน", "อาหารทะเล"],
    ["ฉัน", "ท้องเสีย", "และ", "อ้วก", "เมื่อคืน", "เพราะ", "กิน", "อาหารทะเล"]
  ],
  traps: { th: ["เพื่อ"], rom: ["pêua"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps) — uses เกือบ
  th: ["เมื่อวาน", "ฉัน", "ปวดหัว", "มาก", "เกือบ", "ไม่ได้", "ไป", "ทำงาน"],
  rom: ["mêua waan", "chăn", "bpùat hŭa", "mâak", "gèuap", "mâi dâai", "bpai", "tam ngaan"],
  en: "Yesterday I had a bad headache. I almost didn't go to work.",
  less: 16,
  answers: [
    ["เมื่อวาน", "ฉัน", "ปวดหัว", "มาก", "เกือบ", "ไม่ได้", "ไป", "ทำงาน"],
    ["ฉัน", "ปวดหัว", "มาก", "เมื่อวาน", "เกือบ", "ไม่ได้", "ไป", "ทำงาน"]
  ],
  traps: { th: ["ไม่เคย", "พรุ่งนี้"], rom: ["mâi koie", "prûng-née"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["เมื่อวาน", "น้อง", "ปวดท้อง", "ทั้งวัน", "และ", "ไม่ได้", "กิน", "อะไร", "เลย"],
  rom: ["mêua waan", "nóng", "bpùat tóng", "táng wan", "láe", "mâi dâai", "gin", "à-rai", "loie"],
  en: "Yesterday my younger sibling had a stomach ache all day and didn't eat anything at all.",
  less: 16,
  traps: { th: ["ไม่เคย", "พรุ่งนี้"], rom: ["mâi koie", "prûng-née"] }
},
{
  // CHANGED (5 tokens, 0 traps) — extended
  th: ["ตอนนี้", "ผม", "เวียนหัว", "และ", "คลื่นไส้", "ผม", "ต้องการ", "ยา"],
  rom: ["dton-née", "pŏm", "wian hŭa", "láe", "klêun sâi", "pŏm", "dtông gaan", "yaa"],
  en: "Right now I feel dizzy and nauseous. I need medicine.",
  less: 16,
  answers: [
    ["ตอนนี้", "ผม", "เวียนหัว", "และ", "คลื่นไส้", "ผม", "ต้องการ", "ยา"],
    ["ตอนนี้", "ผม", "คลื่นไส้", "และ", "เวียนหัว", "ผม", "ต้องการ", "ยา"]
  ],
  traps: { th: ["อยาก", "ต้อง"], rom: ["yàak", "dtông"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps) — uses นอนไม่หลับ (couldn't sleep)
  th: ["เมื่อคืน", "ผม", "ไอ", "ทั้งคืน", "นอน", "ไม่", "หลับ", "เลย"],
  rom: ["mêua keun", "pŏm", "ai", "táng keun", "non", "mâi", "làp", "loie"],
  en: "Last night I coughed all night. I couldn't sleep at all.",
  less: 16,
  traps: { th: ["ทั้งวัน", "คืนนี้"], rom: ["táng wan", "keun née"] }
},
{
  // CHANGED (5 tokens, 0 traps) — uses พักผ่อนเยอะๆ นะ from the vocab
  th: ["คิด", "ว่า", "เธอ", "ยัง", "ไม่", "หาย", "พักผ่อน", "เยอะๆ", "นะ"],
  rom: ["kít", "wâa", "ter", "yang", "mâi", "hăai", "pák pòn", "yúh yúh", "ná"],
  en: "I think you're still not better. Get plenty of rest! (informal)",
  less: 16,
  traps: { th: ["แล้ว", "หา"], rom: ["láew", "hăa"] }
},
{
  // CHANGED (7 tokens, 0 traps; "ดูหนังสนุกสามเรื่อง" is a bit awkward)
  th: ["เมื่อวาน", "ผม", "ดู", "หนัง", "สาม", "เรื่อง", "แต่", "ไม่", "สนุก", "เลย"],
  rom: ["mêua waan", "pŏm", "doo", "năng", "săam", "rêuang", "dtàe", "mâi", "sà-nùk", "loie"],
  en: "Yesterday I watched three movies, but they weren't fun at all.",
  less: 16,
  answers: [
    ["เมื่อวาน", "ผม", "ดู", "หนัง", "สาม", "เรื่อง", "แต่", "ไม่", "สนุก", "เลย"],
    ["ผม", "ดู", "หนัง", "สาม", "เรื่อง", "เมื่อวาน", "แต่", "ไม่", "สนุก", "เลย"]
  ],
  traps: { th: ["คน", "ตัว"], rom: ["kon", "dtua"] }
},
{
  // CHANGED: "กินผัดไทยอร่อยกับเพื่อน" is awkward word order
  th: ["เมื่อคืน", "ผม", "กิน", "ผัดไทย", "สอง", "จาน", "เพราะ", "หิว", "มาก"],
  rom: ["mêua keun", "pŏm", "gin", "pàt thai", "sŏng", "jaan", "prór", "hĭw", "mâak"],
  en: "Last night I ate two plates of Pad Thai because I was very hungry.",
  less: 16,
  answers: [
    ["เมื่อคืน", "ผม", "กิน", "ผัดไทย", "สอง", "จาน", "เพราะ", "หิว", "มาก"],
    ["ผม", "กิน", "ผัดไทย", "สอง", "จาน", "เมื่อคืน", "เพราะ", "หิว", "มาก"]
  ],
  traps: { th: ["แก้ว", "เพื่อ"], rom: ["gâew", "pêua"] }
},
{
  th: ["คุณ", "เคย", "ไป", "ญี่ปุ่น", "หรือ", "ไต้หวัน", "ไหม"],
  rom: ["kun", "koie", "bpai", "yêe-bpùn", "rĕu", "tâi-wăn", "măi"],
  en: "Have you ever been to Japan or Taiwan?",
  less: 16,
  answers: [
    ["คุณ", "เคย", "ไป", "ญี่ปุ่น", "หรือ", "ไต้หวัน", "ไหม"],
    ["คุณ", "เคย", "ไป", "ไต้หวัน", "หรือ", "ญี่ปุ่น", "ไหม"]
  ],
  traps: { th: ["แต่", "ยัง"], rom: ["dtàe", "yang"] }  // ADDED traps
},
{
  // CHANGED (7 tokens, 0 traps; the new Pad Thai sentence above also has "two plates") — uses months + ครั้งแรก
  th: ["เรา", "เจอ", "กัน", "ครั้งแรก", "เดือน", "มีนาคม", "ปี", "ที่แล้ว"],
  rom: ["rao", "jer", "gan", "kráng râek", "deuan", "mee-naa kom", "bpee", "têe láew"],
  en: "We met for the first time in March last year.",
  less: 16,
  answers: [
    ["เรา", "เจอ", "กัน", "ครั้งแรก", "เดือน", "มีนาคม", "ปี", "ที่แล้ว"],
    ["เดือน", "มีนาคม", "ปี", "ที่แล้ว", "เรา", "เจอ", "กัน", "ครั้งแรก"]
  ],
  traps: { th: ["เมษายน", "ครั้ง"], rom: ["may-săa-yon", "kráng"] }
},
{
  // CHANGED (6 tokens, 0 traps; "อาหารไทยเผ็ด" needs เผ็ดๆ to sound natural)
  th: ["เธอ", "เคย", "ลอง", "ส้มตำ", "ไหม", "เผ็ด", "มาก", "นะ"],
  rom: ["ter", "koie", "long", "sôm dtam", "măi", "pèt", "mâak", "ná"],
  en: "Have you ever tried papaya salad? It's very spicy! (informal)",
  less: 16,
  traps: { th: ["ยัง", "กำลัง"], rom: ["yang", "gam-lang"] }
},
{
  // CHANGED (6 tokens, 0 traps) — extended
  th: ["เมื่อคืน", "พวกเรา", "ดื่ม", "เบียร์", "สาม", "แก้ว", "และ", "ดู", "ฟุตบอล", "ด้วยกัน"],
  rom: ["mêua keun", "pûak rao", "dèum", "bia", "săam", "gâew", "láe", "doo", "fút bon", "dûay gan"],
  en: "Last night we drank three glasses of beer and watched football together.",
  less: 16,
  answers: [
    ["เมื่อคืน", "พวกเรา", "ดื่ม", "เบียร์", "สาม", "แก้ว", "และ", "ดู", "ฟุตบอล", "ด้วยกัน"],
    ["พวกเรา", "ดื่ม", "เบียร์", "สาม", "แก้ว", "และ", "ดู", "ฟุตบอล", "ด้วยกัน", "เมื่อคืน"]
  ],
  traps: { th: ["จาน", "ชาม"], rom: ["jaan", "chaam"] }  // (not ขวด — "three bottles of beer" is also valid Thai)
},
{
  // CHANGED: "ซื้อรถยนต์สีดำหนึ่งคัน" sounds like counting stock
  th: ["ปี", "ที่แล้ว", "ผม", "ซื้อ", "รถยนต์", "สีดำ", "แต่", "ภรรยา", "ไม่", "ชอบ", "สีดำ"],
  rom: ["bpee", "têe láew", "pŏm", "séu", "rót yon", "sĕe dam", "dtàe", "pan-rá-yaa", "mâi", "chôp", "sĕe dam"],
  en: "Last year I bought a black car, but my wife doesn't like black.",
  less: 16,
  answers: [
    ["ปี", "ที่แล้ว", "ผม", "ซื้อ", "รถยนต์", "สีดำ", "แต่", "ภรรยา", "ไม่", "ชอบ", "สีดำ"],
    ["ผม", "ซื้อ", "รถยนต์", "สีดำ", "ปี", "ที่แล้ว", "แต่", "ภรรยา", "ไม่", "ชอบ", "สีดำ"]
  ],
  traps: { th: ["หน้า"], rom: ["nâa"] }
},
{
  // CHANGED (5 tokens, 0 traps) — extended
  th: ["พวกเขา", "กิน", "เสร็จ", "แล้ว", "แต่", "ยัง", "ไม่ได้", "จ่าย", "เงิน"],
  rom: ["pûak kăo", "gin", "sèt", "láew", "dtàe", "yang", "mâi dâai", "jàai", "ngern"],
  en: "They've finished eating, but they haven't paid yet.",
  less: 16,
  traps: { th: ["เลิก", "เคย"], rom: ["lêrk", "koie"] }
},
{
  // CHANGED (8 tokens, 0 traps; 4th "didn't go to work because I was sick" sentence)
  th: ["ขอโทษ", "นะ", "เมื่อวาน", "ฉัน", "ไม่ได้", "โทรหา", "เธอ", "เพราะ", "ลืม"],
  rom: ["kŏr tôht", "ná", "mêua waan", "chăn", "mâi dâai", "toh hăa", "ter", "prór", "leum"],
  en: "Sorry, I didn't call you yesterday because I forgot. (informal)",
  less: 16,
  answers: [
    ["ขอโทษ", "นะ", "เมื่อวาน", "ฉัน", "ไม่ได้", "โทรหา", "เธอ", "เพราะ", "ลืม"],
    ["ขอโทษ", "นะ", "ฉัน", "ไม่ได้", "โทรหา", "เธอ", "เมื่อวาน", "เพราะ", "ลืม"]
  ],
  traps: { th: ["ไม่เคย", "เพื่อ"], rom: ["mâi koie", "pêua"] }
},
{
  // CHANGED (5 tokens, 0 traps) — extended
  th: ["วันนี้", "ผม", "ไม่ได้", "ไป", "ทำงาน", "เพราะ", "เป็น", "วันหยุด"],
  rom: ["wan née", "pŏm", "mâi dâai", "bpai", "tam ngaan", "prór", "bpen", "wan yùt"],
  en: "Today I didn't go to work because it's a holiday.",
  less: 16,
  answers: [
    ["วันนี้", "ผม", "ไม่ได้", "ไป", "ทำงาน", "เพราะ", "เป็น", "วันหยุด"],
    ["ผม", "ไม่ได้", "ไป", "ทำงาน", "วันนี้", "เพราะ", "เป็น", "วันหยุด"]
  ],
  traps: { th: ["หยุด", "คือ"], rom: ["yùt", "keu"] }
},
{
  // CHANGED: เคย + a specific time ("two years ago") is confusing; ของฉัน was one token (ของ + ฉัน everywhere else)
  th: ["พี่ชาย", "ของ", "ฉัน", "เคย", "เรียน", "ภาษา", "ไทย", "ที่", "กรุงเทพ", "สอง", "ปี"],
  rom: ["pêe chaai", "kŏng", "chăn", "koie", "rian", "paa-săa", "Thai", "têe", "grung têp", "sŏng", "bpee"],
  en: "My older brother once studied Thai in Bangkok for two years.",
  less: 16,
  traps: { th: ["ยัง", "หน้า"], rom: ["yang", "nâa"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["คุณ", "จะ", "กลับบ้าน", "เมื่อไหร่", "แม่", "คิดถึง", "มาก"],
  rom: ["kun", "jà", "glàp bâan", "mêua-rài", "mâe", "kít tĕung", "mâak"],
  en: "When are you coming home? Mom misses you a lot.",
  less: 16,
  answers: [
    ["คุณ", "จะ", "กลับบ้าน", "เมื่อไหร่", "แม่", "คิดถึง", "มาก"],
    ["เมื่อไหร่", "คุณ", "จะ", "กลับบ้าน", "แม่", "คิดถึง", "มาก"]
  ],
  traps: { th: ["อะไร", "กี่"], rom: ["à-rai", "gèe"] }
},
{
  // CHANGED (5 tokens, 0 traps) — extended
  th: ["คุณ", "จะ", "ไป", "ญี่ปุ่น", "เมื่อไหร่", "และ", "จะ", "ไป", "กี่", "วัน"],
  rom: ["kun", "jà", "bpai", "yêe-bpùn", "mêua-rài", "láe", "jà", "bpai", "gèe", "wan"],
  en: "When are you going to Japan, and for how many days?",
  less: 16,
  answers: [
    ["คุณ", "จะ", "ไป", "ญี่ปุ่น", "เมื่อไหร่", "และ", "จะ", "ไป", "กี่", "วัน"],
    ["เมื่อไหร่", "คุณ", "จะ", "ไป", "ญี่ปุ่น", "และ", "จะ", "ไป", "กี่", "วัน"]
  ],
  traps: { th: ["เท่าไหร่"], rom: ["tâo rài"] }
},
{
  // CHANGED (5 tokens, 0 traps) — pairs with "I bought this car two years ago" in part 1
  th: ["เธอ", "ซื้อ", "รถ", "คัน", "นี้", "เมื่อไหร่", "สวย", "มาก"],
  rom: ["ter", "séu", "rót", "kan", "née", "mêua-rài", "sŭay", "mâak"],
  en: "When did you buy this car? It's really nice! (informal)",
  less: 16,
  traps: { th: ["ตัว", "นี่"], rom: ["dtua", "nêe"] }
},
{
  // CHANGED (too easy: 4 tokens, 0 traps)
  th: ["คุณ", "ทำการบ้าน", "เสร็จ", "เมื่อไหร่", "เมื่อคืน", "หรือ", "เมื่อเช้านี้"],
  rom: ["kun", "tam gaan bâan", "sèt", "mêua-rài", "mêua keun", "rĕu", "mêua cháo née"],
  en: "When did you finish your homework — last night or this morning?",
  less: 16,
  answers: [
    ["คุณ", "ทำการบ้าน", "เสร็จ", "เมื่อไหร่", "เมื่อคืน", "หรือ", "เมื่อเช้านี้"],
    ["คุณ", "ทำการบ้าน", "เสร็จ", "เมื่อไหร่", "เมื่อเช้านี้", "หรือ", "เมื่อคืน"]
  ],
  traps: { th: ["คืนนี้", "เลิก"], rom: ["keun née", "lêrk"] }
},
{
  // CHANGED: เร็วๆ นี้ on its own means "soon" in everyday Thai, not "recently"
  th: ["สาม", "วัน", "ที่แล้ว", "ผม", "ไป", "พัทยา", "มา", "ทะเล", "สวย", "มาก"],
  rom: ["săam", "wan", "têe láew", "pŏm", "bpai", "pát-tá-yaa", "maa", "tá-lay", "sŭay", "mâak"],
  en: "Three days ago I went to Pattaya. The sea was beautiful.",
  less: 16,
  traps: { th: ["หน้า", "จะ"], rom: ["nâa", "jà"] }
},
{
  // CHANGED: เร็วๆ นี้ used as "recently" — now used as "soon", with จะ
  th: ["เร็ว ๆ นี้", "ฉัน", "จะ", "เริ่ม", "เรียน", "ภาษา", "จีน"],
  rom: ["reo reo née", "chăn", "jà", "rêrm", "rian", "paa-săa", "jeen"],
  en: "Soon I'm going to start learning Chinese.",
  less: 16,
  answers: [
    ["เร็ว ๆ นี้", "ฉัน", "จะ", "เริ่ม", "เรียน", "ภาษา", "จีน"],
    ["ฉัน", "จะ", "เริ่ม", "เรียน", "ภาษา", "จีน", "เร็ว ๆ นี้"]
  ],
  traps: { th: ["ที่แล้ว", "เคย"], rom: ["têe láew", "koie"] }
},
{
  // CHANGED (5 tokens, 0 traps; "เร็วๆ นี้ + จะไปญี่ปุ่น" moved to the sentence above) — uses งั้น
  th: ["ฝนตก", "แล้ว", "งั้น", "เรา", "อยู่", "บ้าน", "ดี", "กว่า"],
  rom: ["fŏn-dtòk", "láew", "ngán", "rao", "yòo", "bâan", "dee", "gwàa"],
  en: "It's started raining. In that case, we'd better stay home.",
  less: 16,
  traps: { th: ["นั้น"], rom: ["nán"] }
},
{
  // CHANGED (6 tokens, 0 traps) — extended
  th: ["อาทิตย์", "ที่แล้ว", "ผม", "ยุ่ง", "มาก", "เลย", "ไม่มี", "เวลา", "พักผ่อน"],
  rom: ["aa-tít", "têe láew", "pŏm", "yûng", "mâak", "loie", "mâi mee", "way-laa", "pák pòn"],  // FIXED "loei" -> "loie" (as in the vocab)
  en: "Last week I was really busy. I had no time to rest.",
  less: 16,
  traps: { th: ["ว่าง", "ไม่ได้"], rom: ["wâang", "mâi dâai"] }
},
{
  // CHANGED (one of 4 identical "…โปรดของคุณคืออะไร" sentences)
  th: ["กีฬา", "โปรด", "ของ", "ผม", "คือ", "ฟุตบอล", "แต่", "ผม", "ไม่เคย", "เล่น", "เลย"],
  rom: ["gee-laa", "bpròht", "kŏng", "pŏm", "keu", "fút bon", "dtàe", "pŏm", "mâi koie", "lên", "loie"],
  en: "My favorite sport is football, but I've never played it.",
  less: 16,
  traps: { th: ["เป็น", "เคย"], rom: ["bpen", "koie"] }
},
{
  // CHANGED (merged with "อาหารโปรดของฉันคือราเม็ง") — question + answer
  th: ["อาหาร", "โปรด", "ของ", "คุณ", "คือ", "อะไร", "ของ", "ฉัน", "คือ", "ราเม็ง"],
  rom: ["aa-hăan", "bpròht", "kŏng", "kun", "keu", "à-rai", "kŏng", "chăn", "keu", "raa-men"],
  en: "What's your favorite food? Mine is ramen.",
  less: 16,
  traps: { th: ["เป็น", "ไหม"], rom: ["bpen", "măi"] }
},
{
  th: ["คุณ", "ชอบ", "อาหาร", "ไทย", "หรือ", "อาหาร", "ฝรั่ง", "มากกว่า", "กัน"],
  rom: ["kun", "chôp", "aa-hăan", "Thai", "rĕu", "aa-hăan", "fà-ràng", "mâak gwàa", "gan"],
  en: "Do you like Thai food or Western food more?",
  less: 16,
  answers: [  // ADDED answers
    ["คุณ", "ชอบ", "อาหาร", "ไทย", "หรือ", "อาหาร", "ฝรั่ง", "มากกว่า", "กัน"],
    ["คุณ", "ชอบ", "อาหาร", "ฝรั่ง", "หรือ", "อาหาร", "ไทย", "มากกว่า", "กัน"]
  ],
  traps: { th: ["และ", "กว่า"], rom: ["láe", "gwàa"] }  // ADDED traps
},
{
  th: ["คุณ", "ชอบ", "อากาศ", "ร้อน", "หรือ", "อากาศ", "หนาว", "มากกว่า", "กัน"],
  rom: ["kun", "chôp", "aa-gàat", "rón", "rĕu", "aa-gàat", "năao", "mâak gwàa", "gan"],
  en: "Do you like hot weather or cold weather more?",
  less: 16,
  answers: [  // ADDED answers
    ["คุณ", "ชอบ", "อากาศ", "ร้อน", "หรือ", "อากาศ", "หนาว", "มากกว่า", "กัน"],
    ["คุณ", "ชอบ", "อากาศ", "หนาว", "หรือ", "อากาศ", "ร้อน", "มากกว่า", "กัน"]
  ],
  traps: { th: ["และ", "หน้าหนาว"], rom: ["láe", "nâa năao"] }  // ADDED traps
},
{
  // CHANGED (6 tokens, 0 traps) — extended
  th: ["ผม", "ชอบ", "ดื่ม", "กาแฟ", "มากกว่า", "ชา", "แต่", "ภรรยา", "ชอบ", "ชา", "มากกว่า"],
  rom: ["pŏm", "chôp", "dèum", "gaa-fae", "mâak gwàa", "chaa", "dtàe", "pan-rá-yaa", "chôp", "chaa", "mâak gwàa"],
  en: "I like coffee more than tea, but my wife prefers tea.",
  less: 16,
  traps: { th: ["ช้า", "กว่า"], rom: ["cháa", "gwàa"] }
},
{
  // CHANGED (one of 4 identical "…โปรดของคุณคืออะไร" sentences) — เคย = "used to" + ไม่…แล้ว
  th: ["ผม", "เคย", "มี", "หมา", "สอง", "ตัว", "แต่", "ตอนนี้", "ไม่มี", "สัตว์เลี้ยง", "แล้ว"],
  rom: ["pŏm", "koie", "mee", "măa", "sŏng", "dtua", "dtàe", "dton-née", "mâi mee", "sàt líang", "láew"],
  en: "I used to have two dogs, but now I don't have any pets anymore.",
  less: 16,
  traps: { th: ["คน", "หลัง"], rom: ["kon", "lăng"] }
},
{
  // CHANGED (one of 4 identical "…โปรดของคุณคืออะไร" sentences; ramen moved into the favorite-food question above)
  th: ["นักแสดง", "โปรด", "ของ", "ฉัน", "เป็น", "คน", "ไทย", "เขา", "หล่อ", "มาก"],
  rom: ["nák-sà-daeng", "bpròht", "kŏng", "chăn", "bpen", "kon", "Thai", "kăo", "lòr", "mâak"],
  en: "My favorite actor is Thai. He's very handsome.",
  less: 16,
  traps: { th: ["คือ"], rom: ["keu"] }
},
{
  // FIXED: มากกว่ากัน was one token here (มากกว่า + กัน everywhere else); ไปเที่ยว as one token (as in L15)
  th: ["คุณ", "อยาก", "ไปเที่ยว", "จีน", "หรือ", "ญี่ปุ่น", "มากกว่า", "กัน"],
  rom: ["kun", "yàak", "bpai tîeow", "jeen", "rĕu", "yêe-bpùn", "mâak gwàa", "gan"],
  en: "Would you rather visit China or Japan?",
  less: 16,
  answers: [  // ADDED answers
    ["คุณ", "อยาก", "ไปเที่ยว", "จีน", "หรือ", "ญี่ปุ่น", "มากกว่า", "กัน"],
    ["คุณ", "อยาก", "ไปเที่ยว", "ญี่ปุ่น", "หรือ", "จีน", "มากกว่า", "กัน"]
  ],
  traps: { th: ["และ", "อยากได้"], rom: ["láe", "yàak dâai"] }  // ADDED traps
},
{
  // CHANGED (6 tokens, 0 traps; part 1 already has "been to Japan twice") — uses อิจฉา
  th: ["อาทิตย์", "ที่แล้ว", "เพื่อน", "ไป", "เที่ยว", "ยุโรป", "มา", "ผม", "อิจฉา", "มาก"],
  rom: ["aa-tít", "têe láew", "pêuan", "bpai", "tîeow", "yú-ròhp", "maa", "pŏm", "ìt-chăa", "mâak"],
  en: "Last week my friend went on a trip to Europe. I'm so jealous.",
  less: 16,
  traps: { th: ["หน้า", "จะ"], rom: ["nâa", "jà"] }
},
{
  // CHANGED (5 tokens, 0 traps; near-copy of "Last week I was really busy") — uses เป็นยังไงบ้าง + เฉยๆ
  th: ["ปาร์ตี้", "เมื่อคืน", "เป็นยังไงบ้าง", "สนุก", "ไหม", "เฉยๆ"],
  rom: ["bpaa-dtêe", "mêua keun", "bpen yang ngai bâang", "sà-nùk", "măi", "chŏie chŏie"],
  en: "How was the party last night? Was it fun? — It was so-so.",
  less: 16,
  traps: { th: ["อะไร", "หรือยัง"], rom: ["à-rai", "rĕu yang"] }
}
];
