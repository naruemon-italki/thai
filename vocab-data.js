/*
  © 2026 Naruemon Rintha. All rights reserved.
  Original educational work created by Naruemon Rintha (Kroo Apple).
  Unauthorized reproduction, modification, or redistribution is prohibited.

  ---------------------------------------------------------------------------
  VOCABULARY & CHARACTER DIALOGUE DATA
  This file defines three globals used by index.html:
    • VOCAB           — array of all vocabulary entries (course + extra pack)
    • PHRASE_AUDIO    — Thai phrases that have a recording but are not vocabulary
    • CHARACTER_LINES — CPU opponent dialogue lines, keyed by character id
  It MUST be loaded (plain <script src>) BEFORE the main game script in
  index.html, because the game builds COURSE_VOCAB / CHARACTERS / LEVELS from
  these at load time. To add or edit words, edit this file only.

  OPTIONAL FIELD — `audio`
    Any VOCAB entry may name an mp3 of a real voice saying that word:

      { en: "Hello.", th: "สวัสดี", rom: "sà-wàt-dee", cat: "Phrases",
        lesson: 1, audio: "sawatdee.mp3" }

    The file lives in ./audio/voice/ (just the filename here, no path). Where a
    word has one, the app plays the recording everywhere it would otherwise have
    spoken that word — the Vocabulary list, Flashcards, Audio Bingo, Connect
    Pairs, Word Cards, the Dictionary, tap-to-hear Thai. Where a word has none,
    which is the default, speech synthesis is used exactly as before.

    Nothing can break by adding this field. A name that points at a file which
    is missing, corrupt or too slow to start falls back to speech synthesis
    automatically, so the word is always pronounced one way or the other.

    Use plain ASCII filenames (no Thai characters, no spaces) — they travel
    through web servers and caches without surprises. Run checkVoiceAudio() in
    the browser console to verify every declared file is actually reachable; a
    typo is otherwise invisible, since the app just quietly speaks instead.

    If two entries share the same Thai text they should name the SAME file (it
    is the same word — ไก่ the animal and ไก่ the food are pronounced alike). If
    they name different files the app cannot tell which is right, so it uses TTS
    for that word and reports it in checkVoiceAudio().
  ---------------------------------------------------------------------------
*/

const VOCAB = [
  // Phrases
  { en: "Hello. (male)", th: "สวัสดีครับ", rom: "sà-wàt-dee kráp", cat: "Phrases", lesson: 1, audio: "sawatdeekrap.mp3" },
  { en: "Hello. (female)", th: "สวัสดีค่ะ", rom: "sà-wàt-dee kâ", cat: "Phrases", lesson: 1, audio: "sawatdeeka.mp3" },
  { en: "See you.", th: "เจอกัน", rom: "jer gan", cat: "Phrases", lesson: 1, audio: "jer-gan.mp3" },
  { en: "polite particle (male)", th: "ครับ", rom: "kráp", cat: "Phrases", lesson: 1, audio: "krap.mp3" },
  { en: "polite particle (female)", th: "ค่ะ; คะ", rom: "kâ (statement); ká (question)", cat: "Phrases", lesson: 1, audio: "ka.mp3" },
  { en: "Yes.", th: "ใช่", rom: "châi", cat: "Phrases", lesson: 2, audio: "chai.mp3" },
  { en: "No.", th: "ไม่", rom: "mâi", cat: "Phrases", lesson: 2, audio: "mai-no.mp3" },
  { en: "Thank you. (male)", th: "ขอบคุณครับ", rom: "kòp kun kráp", cat: "Phrases", lesson: 1, audio: "kop-kun-krap.mp3" },
  { en: "Thank you. (female)", th: "ขอบคุณค่ะ", rom: "kòp kun kâ", cat: "Phrases", lesson: 1, audio: "kop-kun-ka.mp3" },
  { en: "I'm 20 years old. (male)", th: "ผมอายุยี่สิบปี", rom: "pŏm aa-yú yêe-sìp bpee", cat: "Phrases", lesson: 4, audio: "pom-aayu-20.mp3" },
  { en: "I'm 50 years old. (female)", th: "ฉันอายุห้าสิบปี", rom: "chăn aa-yú hâa-sìp bpee", cat: "Phrases", lesson: 4, audio: "chan-aayu-50.mp3" },
  { en: "Sorry. (male)", th: "ขอโทษครับ", rom: "kŏr tôht kráp", cat: "Phrases", lesson: 4, audio: "kor-toth-krap.mp3" },
  { en: "Sorry. (female)", th: "ขอโทษค่ะ", rom: "kŏr tôht kâ", cat: "Phrases", lesson: 4, audio: "kor-toth-ka.mp3" },
  { en: "Nice to meet you.", th: "ยินดีที่ได้รู้จัก", rom: "yin dee têe dâai róo jàk", cat: "Phrases", lesson: 1, audio: "yin-dee-tee-daai-roo-jak.mp3" },
  { en: "You are welcome.", th: "ยินดี", rom: "yin dee (kráp/kâ)", cat: "Phrases", lesson: 4, audio: "yin-dee-ka.mp3" },
  { en: "How are you?", th: "สบายดีไหม", rom: "sà-baai dee măi", cat: "Phrases", lesson: 2, audio: "sabai-dee-mai.mp3" },
  { en: "I'm fine.", th: "สบายดี", rom: "sà-baai dee", cat: "Phrases", lesson: 2, audio: "sabai-dee.mp3" },
  { en: "Pardon? / What was that? (male)", th: "อะไรนะครับ", rom: "à-rai ná kráp", cat: "Phrases", lesson: 3, audio: "arainakrap.mp3" },
  { en: "Pardon? / What was that? (female)", th: "อะไรนะคะ", rom: "à-rai ná ká", cat: "Phrases", lesson: 3, audio: "arainaka.mp3" },
  { en: "Where?", th: "ที่ไหน", rom: "(têe) năi", cat: "Phrases", lesson: 2, audio: "tee-nai.mp3" },
  { en: "(1) Where? (2) Which?", th: "ไหน", rom: "năi", cat: "Phrases", lesson: 8, audio: "nai.mp3" },
  { en: "And you?", th: "แล้วคุณล่ะ", rom: "láew kun lâ", cat: "Phrases", lesson: 2, audio: "laew-kun-la.mp3" },
  { en: "Where are you from?", th: "คุณมาจากที่ไหน", rom: "kun maa jàak têe năi", cat: "Phrases", lesson: 2, audio: "kun-maa-jaak.mp3" },
  { en: "How old are you?", th: "คุณอายุเท่าไหร่", rom: "kun aa-yú tâo rai", cat: "Phrases", lesson: 4, audio: "kun-aayu-tao-rai.mp3" },
  { en: "Help!", th: "ช่วยด้วย", rom: "chûay dûay", cat: "Phrases", lesson: 4, audio: "chuay-duay.mp3" },
  { en: "Very good.", th: "ดีมาก", rom: "dee mâak", cat: "Phrases", lesson: 1, audio: "dee-maak.mp3" },
  { en: "Very skilled. / Great job!", th: "เก่งมาก", rom: "gèng mâak", cat: "Phrases", lesson: 9, audio: "geng-maak.mp3" },
  { en: "What?", th: "อะไร", rom: "à-rai", cat: "Phrases", lesson: 1, audio: "arai.mp3" },
  { en: "What's your name?", th: "คุณชื่ออะไร", rom: "kun chûu à-rai", cat: "Phrases", lesson: 1, audio: "kun_chuu_arai.mp3" },
  { en: "to use the phone", th: "เล่นโทรศัพท์", rom: "lên toh-rá-sàp", cat: "Phrases", lesson: 6, audio: "len-toh.mp3" },
  { en: "a little bit", th: "นิดหน่อย", rom: "nít nòi", cat: "Adverbs", lesson: 6, audio: "nit-noi.mp3" },
  { en: "Shall we ...?", th: "กันไหม", rom: "gan măi", cat: "Function", lesson: 6, audio: "gan-mai.mp3" },
  { en: "Just a moment.", th: "แป๊บหนึ่ง", rom: "bpáep nèung", cat: "Phrases", lesson: 6, audio: "bpaep-neung.mp3" },
  { en: "Wait; Hold on. ('a moment')", th: "เดี๋ยว", rom: "dĭeow", cat: "Phrases", lesson: 6, audio: "dieow.mp3" },
  { en: "Please wait a moment.", th: "รอสักครู่", rom: "ror sàk krôo", cat: "Phrases", lesson: 6, audio: "ror-sak-kroo.mp3" },
  { en: "Are you hungry?", th: "หิวไหม", rom: "hĭw măi", cat: "Phrases", lesson: 6, audio: "hiw-mai.mp3" },
  { en: "Really?", th: "จริงเหรอ", rom: "jing rŏr", cat: "Phrases", lesson: 7, audio: "jing-ror.mp3" },
  { en: "Really!", th: "จริงๆ", rom: "jing jing", cat: "Phrases", lesson: 7, audio: "jing-jing.mp3" },
  { en: "I don't like it.", th: "ไม่ชอบ", rom: "mâi chôp", cat: "Phrases", lesson: 7, audio: "mai-chop.mp3" },
  { en: "I don't understand.", th: "ไม่เข้าใจ", rom: "mâi kâo jai", cat: "Phrases", lesson: 7, audio: "mai-kao-jai.mp3" },
  { en: "Do you understand?", th: "เข้าใจไหม", rom: "kâo jai măi", cat: "Phrases", lesson: 7, audio: "kao-jai-mai.mp3" },
  { en: "I don't know.", th: "ไม่รู้", rom: "mâi róo", cat: "Phrases", lesson: 7, audio: "mai-roo.mp3" },
  { en: "I don't know yet.", th: "ยังไม่รู้", rom: "yang mâi róo", cat: "Phrases", lesson: 7, audio: "yang-mai-roo.mp3" },
  { en: "Do you know?", th: "รู้ไหม", rom: "róo măi", cat: "Phrases", lesson: 7, audio: "roo-mai.mp3" },
  { en: "What's the matter?", th: "เป็นอะไร", rom: "bpen à-rai", cat: "Phrases", lesson: 8, audio: "bpen-arai.mp3" },
  { en: "Where's the bathroom?", th: "ห้องน้ำอยู่ไหน", rom: "hông náam yòo năi (kráp/ká)", cat: "Phrases", lesson: 8, audio: "hong-naam-yoo-nai.mp3" },
  { en: "Who?", th: "ใคร", rom: "krai", cat: "Phrases", lesson: 8, audio: "krai.mp3" },
  { en: "Why?", th: "ทำไม", rom: "tam-mai", cat: "Phrases", lesson: 9, audio: "tam-mai.mp3" },
  { en: "likewise", th: "เช่นกัน", rom: "chên gan", cat: "Phrases", lesson: 9, audio: "chen-gan.mp3" },
  { en: "here", th: "ที่นี่", rom: "têe nêe", cat: "Phrases", lesson: 9, audio: "tee-nee.mp3" },
  { en: "there", th: "ที่นั่น", rom: "têe nân", cat: "Phrases", lesson: 9, audio: "tee-nan.mp3" },
  { en: "it's okay; no problem", th: "ไม่เป็นไร", rom: "mâi bpen rai", cat: "Phrases", lesson: 8, audio: "mai-bpen-rai.mp3" },
  { en: "…right?; …is that true?", th: "ใช่ไหม", rom: "châi măi", cat: "Function", lesson: 6, audio: "chai-mai.mp3" },
  { en: "no; not correct; is not", th: "ไม่ใช่", rom: "mâi châi", cat: "Phrases", lesson: 8, audio: "mai-chai.mp3" },
  { en: "very", th: "มาก", rom: "mâak", cat: "Adverbs", lesson: 7, audio: "maak.mp3" },
  { en: "me too; same here", th: "เหมือนกัน", rom: "mĕuan gan", cat: "Phrases", lesson: 7, audio: "meuan-gan.mp3" },
  { en: "Very delicious.", th: "อร่อยมาก", rom: "à-ròi mâak", cat: "Phrases", lesson: 9, audio: "aroi-maak.mp3" },
  { en: "I miss you so much.", th: "คิดถึงจัง", rom: "kít tĕung jang", cat: "Phrases", lesson: 9, audio: "kit-teung-jang.mp3" },

  // Pronouns
  { en: "I (male)", th: "ผม", rom: "pŏm", cat: "Pronouns", lesson: 1, audio: "pom.mp3" },
  { en: "I (female)", th: "ฉัน", rom: "chăn", cat: "Pronouns", lesson: 1, audio: "chan.mp3" },
  { en: "I (female, formal)", th: "ดิฉัน", rom: "dì-chăn", cat: "Pronouns", lesson: 1, audio: "di-chan.mp3" },
  { en: "you", th: "คุณ", rom: "kun", cat: "Pronouns", lesson: 1, audio: "kun.mp3" },
  { en: "he; she", th: "เขา", rom: "kăo", cat: "Pronouns", lesson: 2, audio: "kao.mp3" },
  { en: "it", th: "มัน", rom: "man", cat: "Pronouns", lesson: 5, audio: "man.mp3" },
  { en: "us; we; I (informal)", th: "เรา", rom: "rao", cat: "Pronouns", lesson: 2, audio: "rao.mp3" },
  { en: "they", th: "พวกเขา", rom: "pûak kăo", cat: "Pronouns", lesson: 5, audio: "puak-kao.mp3" },
  { en: "(1) you (informal); (2) her", th: "เธอ", rom: "ter", cat: "Pronouns", lesson: 9, audio: "ter.mp3" },
  { en: "my; mine (male)", th: "ของผม", rom: "kŏng pŏm", cat: "Pronouns", lesson: 11, audio: "kong-pom.mp3" },
  { en: "my; mine (female)", th: "ของฉัน", rom: "kŏng chăn", cat: "Pronouns", lesson: 11, audio: "kong-chan.mp3" },
  { en: "your; yours", th: "ของคุณ", rom: "kŏng kun", cat: "Pronouns", lesson: 11, audio: "kong-kun.mp3" },

  // Numbers
  { en: "zero (0)", th: "ศูนย์", rom: "sŏon", cat: "Numbers", lesson: 3, audio: "num-0.mp3" },
  { en: "one (1)", th: "หนึ่ง", rom: "nèung", cat: "Numbers", lesson: 3, audio: "num-1.mp3" },
  { en: "two (2)", th: "สอง", rom: "sŏng", cat: "Numbers", lesson: 3, audio: "num-2.mp3" },
  { en: "three (3)", th: "สาม", rom: "săam", cat: "Numbers", lesson: 3, audio: "num-3.mp3" },
  { en: "four (4)", th: "สี่", rom: "sèe", cat: "Numbers", lesson: 3, audio: "num-4.mp3" },
  { en: "five (5)", th: "ห้า", rom: "hâa", cat: "Numbers", lesson: 3, audio: "num-5.mp3" },
  { en: "six (6)", th: "หก", rom: "hòk", cat: "Numbers", lesson: 3, audio: "num-6.mp3" },
  { en: "seven (7)", th: "เจ็ด", rom: "jèt", cat: "Numbers", lesson: 3, audio: "num-7.mp3" },
  { en: "eight (8)", th: "แปด", rom: "bpàet", cat: "Numbers", lesson: 3, audio: "num-8.mp3" },
  { en: "nine (9)", th: "เก้า", rom: "gâo", cat: "Numbers", lesson: 3, audio: "num-9.mp3" },
  { en: "ten (10)", th: "สิบ", rom: "sìp", cat: "Numbers", lesson: 3, audio: "num-10.mp3" },
  { en: "eleven (11)", th: "สิบเอ็ด", rom: "sìp èt", cat: "Numbers", lesson: 3, audio: "num-11.mp3" },
  { en: "twelve (12)", th: "สิบสอง", rom: "sìp sŏng", cat: "Numbers", lesson: 3, audio: "num-12.mp3" },
  { en: "thirteen (13)", th: "สิบสาม", rom: "sìp săam", cat: "Numbers", lesson: 3, audio: "num-13.mp3" },
  { en: "fourteen (14)", th: "สิบสี่", rom: "sìp sèe", cat: "Numbers", lesson: 3, audio: "num-14.mp3" },
  { en: "fifteen (15)", th: "สิบห้า", rom: "sìp hâa", cat: "Numbers", lesson: 3, audio: "num-15.mp3" },
  { en: "sixteen (16)", th: "สิบหก", rom: "sìp hòk", cat: "Numbers", lesson: 3, audio: "num-16.mp3" },
  { en: "seventeen (17)", th: "สิบเจ็ด", rom: "sìp jèt", cat: "Numbers", lesson: 3, audio: "num-17.mp3" },
  { en: "eighteen (18)", th: "สิบแปด", rom: "sìp bpàet", cat: "Numbers", lesson: 3, audio: "num-18.mp3" },
  { en: "nineteen (19)", th: "สิบเก้า", rom: "sìp gâo", cat: "Numbers", lesson: 3, audio: "num-19.mp3" },
  { en: "twenty (20)", th: "ยี่สิบ", rom: "yêe-sìp", cat: "Numbers", lesson: 3, audio: "num-20.mp3" },
  { en: "twenty one (21)", th: "ยี่สิบเอ็ด", rom: "yêe-sìp èt", cat: "Numbers", lesson: 3, audio: "num-21.mp3" },
  { en: "twenty five (25)", th: "ยี่สิบห้า", rom: "yêe-sìp hâa", cat: "Numbers", lesson: 3, audio: "num-25.mp3" },
  { en: "thirty (30)", th: "สามสิบ", rom: "săam-sìp", cat: "Numbers", lesson: 3, audio: "num-30.mp3" },
  { en: "thirty-five (35)", th: "สามสิบห้า", rom: "săam-sìp hâa", cat: "Numbers", lesson: 3, audio: "num-35.mp3" },
  { en: "fifty (50)", th: "ห้าสิบ", rom: "hâa-sìp", cat: "Numbers", lesson: 3, audio: "num-50.mp3" },
  { en: "sixty (60)", th: "หกสิบ", rom: "hòk-sìp", cat: "Numbers", lesson: 3, audio: "num-60.mp3" },
  { en: "sixty-seven (67)", th: "หกสิบเจ็ด", rom: "hòk-sìp jèt", cat: "Numbers", lesson: 3, audio: "num-67.mp3" },
  { en: "eighty (80)", th: "แปดสิบ", rom: "bpàet-sìp", cat: "Numbers", lesson: 3, audio: "num-80.mp3" },
  { en: "eighty-eight (88)", th: "แปดสิบแปด", rom: "bpàet-sìp bpàet", cat: "Numbers", lesson: 3, audio: "num-88.mp3" },
  { en: "ninety nine (99)", th: "เก้าสิบเก้า", rom: "gâo-sìp gâo", cat: "Numbers", lesson: 3, audio: "num-99.mp3" },
  { en: "one hundred (100)", th: "หนึ่งร้อย", rom: "nèung rói", cat: "Numbers", lesson: 3, audio: "num-100.mp3" },
  { en: "two hundred and forty-one (241)", th: "สองร้อยสี่สิบเอ็ด", rom: "sŏng-rói sèe-sìp èt", cat: "Numbers", lesson: 3, audio: "num-241.mp3" },
  { en: "four hundred and eighteen (418)", th: "สี่ร้อยสิบแปด", rom: "sèe-rói sìp-bpàet", cat: "Numbers", lesson: 3, audio: "num-418.mp3" },
  { en: "six hundred and ninety (690)", th: "หกร้อยเก้าสิบ", rom: "hòk-rói gâo-sìp", cat: "Numbers", lesson: 3, audio: "num-690.mp3" },
  { en: "seven hundred and eighty-five (785)", th: "เจ็ดร้อยแปดสิบห้า", rom: "jèt-rói bpàet-sìp hâa", cat: "Numbers", lesson: 3, audio: "num-785.mp3" },
  { en: "one thousand (1,000)", th: "หนึ่งพัน", rom: "nèung pan", cat: "Numbers", lesson: 3, audio: "num-1000.mp3" },
  { en: "three thousand two hundred and fifty (3,250)", th: "สามพันสองร้อยห้าสิบ", rom: "săam-pan sŏng-rói hâa-sìp", cat: "Numbers", lesson: 3, audio: "num-3250.mp3" },
  { en: "four thousand one hundred and one (4,101)", th: "สี่พันหนึ่งร้อยหนึ่ง", rom: "sèe-pan nèung-rói nèung", cat: "Numbers", lesson: 3, audio: "num-4101.mp3" },
  { en: "four thousand one hundred and fifty-one (4,151)", th: "สี่พันหนึ่งร้อยห้าสิบเอ็ด", rom: "sèe-pan nèung-rói hâa-sìp èt", cat: "Numbers", lesson: 3, audio: "num-4151.mp3" },
  { en: "six thousand seven hundred and forty (6,740)", th: "หกพันเจ็ดร้อยสี่สิบ", rom: "hòk-pan jèt-rói sèe-sìp", cat: "Numbers", lesson: 3, audio: "num-6740.mp3" },
  { en: "ten thousand (10,000)", th: "หนึ่งหมื่น", rom: "(nèung) mèun", cat: "Numbers", lesson: 3, audio: "meun.mp3" },
  { en: "twenty-five thousand four hundred (25,400)", th: "สองหมื่นห้าพันสี่ร้อย", rom: "sŏng-mèun hâa-pan sèe-rói", cat: "Numbers", lesson: 3, audio: "num-25400.mp3" },
  { en: "seventy thousand (70,000)", th: "เจ็ดหมื่น", rom: "jèt mèun", cat: "Numbers", lesson: 3, audio: "num-70k.mp3" },
  { en: "eighty-five thousand three hundred (85,300)", th: "แปดหมื่นห้าพันสามร้อย", rom: "bpàet-mèun hâa-pan săam-rói", cat: "Numbers", lesson: 3, audio: "num-85300.mp3" },
  { en: "hundred thousand (100,000)", th: "หนึ่งแสน", rom: "(nèung) săen", cat: "Numbers", lesson: 3, audio: "saen.mp3" },
  { en: "five hundred and forty thousand (540,000)", th: "ห้าแสนสี่หมื่น", rom: "hâa-săen sèe-mèun", cat: "Numbers", lesson: 3, audio: "num-540k.mp3" },
  { en: "million (1,000,000)", th: "หนึ่งล้าน", rom: "(nèung) láan", cat: "Numbers", lesson: 3, audio: "laan.mp3" },
  { en: "three million (3,000,000)", th: "สามล้าน", rom: "săam láan", cat: "Numbers", lesson: 3, audio: "num-3-mil.mp3" },
  { en: "four point nine million (4,900,000)", th: "สี่จุดเก้าล้าน", rom: "sèe jùt gâo láan", cat: "Numbers", lesson: 3, audio: "num-4-9-mil.mp3" },

  // Nouns
  { en: "country", th: "ประเทศ", rom: "bprà-têt", cat: "Nouns", lesson: 2, audio: "bpratet.mp3" },
  { en: "Thailand", th: "ประเทศไทย", rom: "bprà-têt Thai", cat: "Nouns", lesson: 2, audio: "thailand.mp3" },
  { en: "France", th: "ประเทศฝรั่งเศส", rom: "bprà-têt fà-ràng-sèt", cat: "Nouns", lesson: 2, audio: "bpratet-farangset.mp3" },
  { en: "Japan", th: "ประเทศญี่ปุ่น", rom: "bprà-têt yêe-bpùn", cat: "Nouns", lesson: 2, audio: "bpratet-yipun.mp3" },
  { en: "China", th: "ประเทศจีน", rom: "bprà-têt jeen", cat: "Nouns", lesson: 2, audio: "bpratet-jeen.mp3" },
  { en: "dog", th: "หมา", rom: "măa", cat: "Nouns", lesson: 4, audio: "maa-dog.mp3" },
  { en: "horse", th: "ม้า", rom: "máa", cat: "Nouns", lesson: 4, audio: "maa-horse.mp3" },
  { en: "year", th: "ปี", rom: "bpee", cat: "Nouns", lesson: 4, audio: "bpee.mp3" },
  { en: "age", th: "อายุ", rom: "aa-yú", cat: "Nouns", lesson: 4, audio: "aayu.mp3" },
  { en: "food", th: "อาหาร", rom: "aa-hăan", cat: "Nouns", lesson: 5, audio: "aa-haan.mp3" },
  { en: "Thai food", th: "อาหารไทย", rom: "aa-hăan Thai", cat: "Nouns", lesson: 5, audio: "aahaan-thai.mp3" },
  { en: "chicken", th: "ไก่", rom: "gài", cat: "Nouns", lesson: 5, audio: "gai.mp3" },
  { en: "water", th: "น้ำ", rom: "náam", cat: "Nouns", lesson: 5, audio: "naam.mp3" },
  { en: "milk", th: "นม", rom: "nom", cat: "Nouns", lesson: 5, audio: "nom.mp3" },
  { en: "beer", th: "เบียร์", rom: "bia", cat: "Nouns", lesson: 5, audio: "bia.mp3" },
  { en: "fruit", th: "ผลไม้", rom: "pŏn-lá-mái", cat: "Nouns", lesson: 5, audio: "pon-la-mai.mp3" },
  { en: "apple", th: "แอปเปิล", rom: "àep-bpêun", cat: "Nouns", lesson: 5, audio: "appen.mp3" },
  { en: "restaurant", th: "ร้านอาหาร", rom: "ráan aa-hăan", cat: "Nouns", lesson: 5, audio: "raan-ahaan.mp3" },
  { en: "work; job", th: "งาน", rom: "ngaan", cat: "Nouns", lesson: 5, audio: "ngaan.mp3" },
  { en: "cat", th: "แมว", rom: "maew", cat: "Nouns", lesson: 5, audio: "maew.mp3" },
  { en: "book", th: "หนังสือ", rom: "năng-sĕu", cat: "Nouns", lesson: 5, audio: "nang-seu.mp3" },
  { en: "medicine", th: "ยา", rom: "yaa", cat: "Nouns", lesson: 5, audio: "yaa.mp3" },
  { en: "language", th: "ภาษา", rom: "paa-săa", cat: "Nouns", lesson: 5, audio: "paasaa.mp3" },
  { en: "Thai language", th: "ภาษาไทย", rom: "paa-săa Thai", cat: "Nouns", lesson: 5, audio: "paasaa-thai.mp3" },
  { en: "English language", th: "ภาษาอังกฤษ", rom: "paa-săa ang-grìt", cat: "Nouns", lesson: 5, audio: "paasaa-angrit.mp3" },
  { en: "name", th: "ชื่อ", rom: "chûu", cat: "Nouns", lesson: 1, audio: "chuu.mp3" },
  { en: "movie", th: "หนัง", rom: "năng", cat: "Nouns", lesson: 6, audio: "nang.mp3" },
  { en: "song", th: "เพลง", rom: "pleng", cat: "Nouns", lesson: 6, audio: "pleng.mp3" },
  { en: "phone", th: "โทรศัพท์", rom: "toh-rá-sàp", cat: "Nouns", lesson: 6, audio: "toh-ra-sap.mp3" },
  { en: "beef", th: "เนื้อ", rom: "néua", cat: "Nouns", lesson: 7, audio: "neua.mp3" },
  { en: "pork", th: "หมู", rom: "mŏo", cat: "Nouns", lesson: 7, audio: "moo.mp3" },
  { en: "fish", th: "ปลา", rom: "bplaa", cat: "Nouns", lesson: 7, audio: "bplaa.mp3" },
  { en: "vegetable", th: "ผัก", rom: "pàk", cat: "Nouns", lesson: 7, audio: "pak.mp3" },
  { en: "this", th: "นี่", rom: "nêe", cat: "Nouns", lesson: 8, audio: "nee.mp3" },
  { en: "that", th: "นั่น", rom: "nân", cat: "Nouns", lesson: 8, audio: "nan.mp3" },
  { en: "home; house", th: "บ้าน", rom: "bâan", cat: "Nouns", lesson: 8, audio: "baan.mp3" },
  { en: "school", th: "โรงเรียน", rom: "rohng rian", cat: "Nouns", lesson: 8, audio: "rohng-rian.mp3" },
  { en: "teacher", th: "ครู", rom: "kroo", cat: "Nouns", lesson: 8, audio: "kroo.mp3" },
  { en: "office worker", th: "พนักงานออฟฟิศ", rom: "pá-nák ngaan óf-fít", cat: "Nouns", lesson: 8, audio: "panak-ngaan-offit.mp3" },
  { en: "businessman", th: "นักธุรกิจ", rom: "nák tú-rá gìt", cat: "Nouns", lesson: 8, audio: "nak-tura-git.mp3" },
  { en: "manager", th: "ผู้จัดการ", rom: "pôo-jàt-gaan", cat: "Nouns", lesson: 8, audio: "poo-jat-gaan.mp3" },
  { en: "car", th: "รถยนต์", rom: "rót yon", cat: "Nouns", lesson: 8, audio: "rot-yon.mp3" },
  { en: "motorbike", th: "รถมอเตอร์ไซค์", rom: "rót mor-dtêr-sai", cat: "Nouns", lesson: 8, audio: "rot-motorsai.mp3" },
  { en: "tuk-tuk", th: "รถตุ๊ก ๆ", rom: "rót túk túk", cat: "Nouns", lesson: 8, audio: "rot-tuk-tuk.mp3" },
  { en: "durian", th: "ทุเรียน", rom: "tú-rian", cat: "Nouns", lesson: 8, audio: "turian.mp3" },
  { en: "vehicle", th: "รถ", rom: "rót", cat: "Nouns", lesson: 8, audio: "rot.mp3" },
  { en: "police", th: "ตำรวจ", rom: "dtam-rùat", cat: "Nouns", lesson: 8, audio: "dtam-ruat.mp3" },
  { en: "doctor", th: "หมอ", rom: "mŏr", cat: "Nouns", lesson: 8, audio: "mor.mp3" },
  { en: "waiter; waitress", th: "พนักงานเสิร์ฟ", rom: "pá-nák ngaan sèrf", cat: "Nouns", lesson: 8, audio: "panak-ngaan-serf.mp3" },
  { en: "receptionist", th: "พนักงานต้อนรับ", rom: "pá-nák ngaan dtôn ráp", cat: "Nouns", lesson: 8, audio: "panak-dton-rap.mp3" },
  { en: "staff; employee", th: "พนักงาน", rom: "pá-nák ngaan", cat: "Nouns", lesson: 8, audio: "panak-ngaan.mp3" },
  { en: "driver", th: "คนขับรถ", rom: "kon kàp rót", cat: "Nouns", lesson: 8, audio: "kon-kap-rot.mp3" },
  { en: "vendor; seller", th: "คนขาย", rom: "kon kăai", cat: "Nouns", lesson: 8, audio: "kon-kaai.mp3" },
  { en: "bathroom", th: "ห้องน้ำ", rom: "hông náam", cat: "Nouns", lesson: 8, audio: "hong-naam.mp3" },
  { en: "nurse", th: "พยาบาล", rom: "pá-yaa-baan", cat: "Nouns", lesson: 8, audio: "pa-yaa-baan.mp3" },
  { en: "student", th: "นักเรียน", rom: "nák rian", cat: "Nouns", lesson: 8, audio: "nak-rian.mp3" },
  { en: "hospital", th: "โรงพยาบาล", rom: "rohng pá-yaa-baan", cat: "Nouns", lesson: 8, audio: "rohng-payaabaan.mp3" },
  { en: "pharmacy", th: "ร้านขายยา", rom: "ráan kăai yaa", cat: "Nouns", lesson: 8, audio: "raan-kaai-yaa.mp3" },
  { en: "shop; store", th: "ร้าน", rom: "ráan", cat: "Nouns", lesson: 8, audio: "raan.mp3" },
  { en: "cinema", th: "โรงหนัง", rom: "rohng năng", cat: "Nouns", lesson: 8, audio: "rohng-nang.mp3" },
  { en: "department store; mall", th: "ห้าง", rom: "hâang", cat: "Nouns", lesson: 8, audio: "haang.mp3" },
  { en: "hotel", th: "โรงแรม", rom: "rohng raem", cat: "Nouns", lesson: 8, audio: "rohng-raem.mp3" },
  { en: "building; hall; facility", th: "โรง", rom: "rohng", cat: "Nouns", lesson: 8, audio: "rohng.mp3" },
  { en: "convenience store", th: "ร้านสะดวกซื้อ", rom: "ráan sà-dùak séu", cat: "Nouns", lesson: 8, audio: "raan-saduak-seu.mp3" },
  { en: "woman", th: "ผู้หญิง", rom: "pôo yĭng", cat: "Nouns", lesson: 9, audio: "poo-ying.mp3" },
  { en: "man", th: "ผู้ชาย", rom: "pôo chaai", cat: "Nouns", lesson: 9, audio: "poo-chai.mp3" },
  { en: "(1) a Westerner; (2) guava", th: "ฝรั่ง", rom: "fà-ràng", cat: "Nouns", lesson: 9, audio: "farang.mp3" },
  { en: "kid", th: "เด็ก", rom: "dèk", cat: "Nouns", lesson: 9, audio: "dek.mp3" },
  { en: "lesson", th: "บทเรียน", rom: "bòt rian", cat: "Nouns", lesson: 9, audio: "bot-rian.mp3" },
  { en: "bird", th: "นก", rom: "nók", cat: "Nouns", lesson: 9, audio: "nok.mp3" },
  { en: "weather", th: "อากาศ", rom: "aa-gàat", cat: "Nouns", lesson: 9, audio: "aa-gaat.mp3" },
  { en: "Bangkok", th: "กรุงเทพ", rom: "grung têp", cat: "Nouns", lesson: 9, audio: "krung-tep.mp3" },
  { en: "tea", th: "ชา", rom: "chaa", cat: "Nouns", lesson: 9, audio: "chaa-tea.mp3" },
  { en: "university student", th: "นักศึกษา", rom: "nák-sèuk-săa", cat: "Nouns", lesson: 9, audio: "nak-seuk-saa.mp3" },
  { en: "price", th: "ราคา", rom: "raa-kaa", cat: "Nouns", lesson: 9, audio: "raakaa.mp3" },
  { en: "cheap price", th: "ราคาถูก", rom: "raa-kaa tòok", cat: "Nouns", lesson: 9, audio: "raakaa-took.mp3" },
  { en: "cheap", th: "ถูก", rom: "tòok", cat: "Adjectives", lesson: 9, audio: "took.mp3" },

  // Verbs
  { en: "to come", th: "มา", rom: "maa", cat: "Verbs", lesson: 4, audio: "maa-come.mp3" },
  { en: "to come from", th: "มาจาก", rom: "maa jàak", cat: "Verbs", lesson: 2, audio: "maa-jaak.mp3" },
  { en: "to like", th: "ชอบ", rom: "chôp", cat: "Verbs", lesson: 5, audio: "chop.mp3" },
  { en: "to eat", th: "กิน", rom: "gin", cat: "Verbs", lesson: 5, audio: "gin.mp3" },
  { en: "to eat a meal", th: "กินข้าว", rom: "gin kâao", cat: "Phrases", lesson: 5, audio: "gin-kaao.mp3" },
  { en: "to drink", th: "ดื่ม", rom: "dèum", cat: "Verbs", lesson: 5, audio: "deum.mp3" },
  { en: "to read", th: "อ่าน", rom: "àan", cat: "Verbs", lesson: 5, audio: "aan.mp3" },
  { en: "to read a book", th: "อ่านหนังสือ", rom: "àan năng-sĕu", cat: "Verbs", lesson: 5, audio: "aan-nang-seu.mp3" },
  { en: "to buy", th: "ซื้อ", rom: "séu", cat: "Verbs", lesson: 5, audio: "seu.mp3" },
  { en: "to do", th: "ทำ", rom: "tam", cat: "Verbs", lesson: 5, audio: "tam.mp3" },
  { en: "to work", th: "ทำงาน", rom: "tam ngaan", cat: "Verbs", lesson: 5, audio: "tam-ngaan.mp3" },
  { en: "to cook", th: "ทำอาหาร", rom: "tam aa-hăan", cat: "Verbs", lesson: 5, audio: "tam-aahaan.mp3" },
  { en: "to go", th: "ไป", rom: "bpai", cat: "Verbs", lesson: 5, audio: "bpai.mp3" },
  { en: "to study", th: "เรียน", rom: "rian", cat: "Verbs", lesson: 5, audio: "rian.mp3" },
  { en: "to exercise", th: "ออกกำลังกาย", rom: "òk gam-lang gaai", cat: "Verbs", lesson: 6, audio: "ok-gam.mp3" },
  { en: "to watch; look", th: "ดู", rom: "doo", cat: "Verbs", lesson: 6, audio: "doo.mp3" },
  { en: "to listen", th: "ฟัง", rom: "fang", cat: "Verbs", lesson: 6, audio: "fang.mp3" },
  { en: "to watch a movie", th: "ดูหนัง", rom: "doo năng", cat: "Verbs", lesson: 6, audio: "doo-nang.mp3" },
  { en: "to listen to music", th: "ฟังเพลง", rom: "fang pleng", cat: "Verbs", lesson: 6, audio: "fang-pleng.mp3" },
  { en: "to play", th: "เล่น", rom: "lên", cat: "Verbs", lesson: 6, audio: "len.mp3" },
  { en: "to be hungry", th: "หิว", rom: "hĭw", cat: "Verbs", lesson: 6, audio: "hiw.mp3" },
  { en: "to be thirsty", th: "หิวน้ำ", rom: "hĭw náam", cat: "Verbs", lesson: 6, audio: "hiw-naam.mp3" },
  { en: "to see", th: "เห็น", rom: "hĕn", cat: "Verbs", lesson: 7, audio: "hen.mp3" },
  { en: "to hear", th: "ได้ยิน", rom: "dâai yin", cat: "Verbs", lesson: 7, audio: "daai-yin.mp3" },
  { en: "to speak", th: "พูด", rom: "pôot", cat: "Verbs", lesson: 7, audio: "poot.mp3" },
  { en: "to tell", th: "บอก", rom: "bòk", cat: "Verbs", lesson: 7, audio: "bok.mp3" },
  { en: "to talk", th: "คุย", rom: "kui", cat: "Verbs", lesson: 7, audio: "kui.mp3" },
  { en: "to know", th: "รู้", rom: "róo", cat: "Verbs", lesson: 7, audio: "roo.mp3" },
  { en: "to know (a person or place)", th: "รู้จัก", rom: "róo jàk", cat: "Verbs", lesson: 7, audio: "roo-jak.mp3" },
  { en: "to understand", th: "เข้าใจ", rom: "kâo jai", cat: "Verbs", lesson: 7, audio: "kao-jai.mp3" },
  { en: "to love", th: "รัก", rom: "rák", cat: "Verbs", lesson: 7, audio: "rak.mp3" },
  { en: "to be; is (equal)", th: "คือ", rom: "keu", cat: "Verbs", lesson: 8, audio: "keu.mp3" },
  { en: "to be (descriptive)", th: "เป็น", rom: "bpen", cat: "Verbs", lesson: 8, audio: "bpen.mp3" },
  { en: "to be at (location)", th: "อยู่", rom: "yòo", cat: "Verbs", lesson: 8, audio: "yoo.mp3" },
  { en: "to rest", th: "พักผ่อน", rom: "pák pòn", cat: "Verbs", lesson: 8, audio: "pak-pon.mp3" },
  { en: "to sell", th: "ขาย", rom: "kăai", cat: "Verbs", lesson: 8, audio: "kaai.mp3" },
  { en: "to drive", th: "ขับรถ", rom: "kàp rót", cat: "Verbs", lesson: 8, audio: "kap-rot.mp3" },

  // Adjectives
  { en: "smart", th: "ฉลาด", rom: "chà-làat", cat: "Adjectives", lesson: 9, audio: "chalaat.mp3" },
  { en: "funny", th: "ตลก", rom: "dtà-lòk", cat: "Adjectives", lesson: 9, audio: "dtalok.mp3" },
  { en: "beautiful", th: "สวย", rom: "sŭay", cat: "Adjectives", lesson: 9, audio: "suay-beautiful.mp3" },
  { en: "unfortunate", th: "ซวย", rom: "suay", cat: "Adjectives", lesson: 9, audio: "suay-unlucky.mp3" },
  { en: "handsome", th: "หล่อ", rom: "lòr", cat: "Adjectives", lesson: 9, audio: "lor.mp3" },
  { en: "kind", th: "ใจดี", rom: "jai dee", cat: "Adjectives", lesson: 9, audio: "jai-dee.mp3" },
  { en: "good", th: "ดี", rom: "dee", cat: "Adjectives", lesson: 9, audio: "dee.mp3" },
  { en: "rude", th: "หยาบคาย", rom: "yàap kaai", cat: "Adjectives", lesson: 9, audio: "yaap-kaai.mp3" },
  { en: "delicious", th: "อร่อย", rom: "à-ròi", cat: "Adjectives", lesson: 9, audio: "aroi.mp3" },
  { en: "spicy", th: "เผ็ด", rom: "pèt", cat: "Adjectives", lesson: 9, audio: "pet.mp3" },
  { en: "cute", th: "น่ารัก", rom: "nâa rák", cat: "Adjectives", lesson: 9, audio: "naa-rak.mp3" },
  { en: "hot", th: "ร้อน", rom: "rón", cat: "Adjectives", lesson: 9, audio: "ron.mp3" },
  { en: "cool; cold", th: "เย็น", rom: "yen", cat: "Adjectives", lesson: 9, audio: "yen.mp3" },
  { en: "cold", th: "หนาว", rom: "năao", cat: "Adjectives", lesson: 9, audio: "naao.mp3" },
  { en: "difficult", th: "ยาก", rom: "yâak", cat: "Adjectives", lesson: 9, audio: "yaak.mp3" },
  { en: "easy", th: "ง่าย", rom: "ngâai", cat: "Adjectives", lesson: 9, audio: "ngaai.mp3" },
  { en: "fun", th: "สนุก", rom: "sà-nùk", cat: "Adjectives", lesson: 9, audio: "sanuk.mp3" },
  { en: "expensive", th: "แพง", rom: "paeng", cat: "Adjectives", lesson: 9, audio: "paeng.mp3" },

  // Conjunction
  { en: "and", th: "และ", rom: "láe", cat: "Conjunction", lesson: 6, audio: "lae.mp3" },
  { en: "but", th: "แต่", rom: "dtàe", cat: "Conjunction", lesson: 7, audio: "dtae.mp3" },
  { en: "or", th: "หรือ", rom: "rĕu", cat: "Conjunction", lesson: 8, audio: "reu.mp3" },
  { en: "because", th: "เพราะ", rom: "prór", cat: "Conjunction", lesson: 9, audio: "pror.mp3" },

  // Function
  { en: "yes/no question particle", th: "ไหม", rom: "măi", cat: "Function", lesson: 2, audio: "mai-question.mp3" },
  { en: "at; that; which; who", th: "ที่", rom: "têe", cat: "Function", lesson: 8, audio: "tee.mp3" },
  { en: "also; then", th: "ก็", rom: "gôr", cat: "Function", lesson: 9, audio: "gor.mp3" },
  // Emotions
  { en: "happy", th: "มีความสุข", rom: "mee kwaam sùk", cat: "Emotions", lesson: 7, audio: "meekwaam.mp3" },
  { en: "bored", th: "เบื่อ", rom: "bèua", cat: "Emotions", lesson: 9, audio: "beua.mp3" },
  { en: "boring", th: "น่าเบื่อ", rom: "nâa bèua", cat: "Emotions", lesson: 9, audio: "naa-beua.mp3" },
  { en: "glad; pleased", th: "ดีใจ", rom: "dee jai", cat: "Emotions", lesson: 7, audio: "dee-jai.mp3" },
  { en: "sad", th: "เศร้า", rom: "sâo", cat: "Emotions", lesson: 7, audio: "sao.mp3" },
  { en: "excited", th: "ตื่นเต้น", rom: "dtèun dtên", cat: "Emotions", lesson: 7, audio: "dteun-dten.mp3" },
  { en: "tired", th: "เหนื่อย", rom: "nèuay", cat: "Emotions", lesson: 7, audio: "neuay.mp3" },
  { en: "angry", th: "โกรธ", rom: "gròht", cat: "Emotions", lesson: 7, audio: "groht.mp3" },
  { en: "scared", th: "กลัว", rom: "glua", cat: "Emotions", lesson: 7, audio: "glua.mp3" },
  { en: "worried", th: "กังวล", rom: "gang-won", cat: "Emotions", lesson: 7, audio: "gang-won.mp3" },
  // ===== Lessons 10-12 additions (+ Adverbs/Classifiers, and 'very') =====
  { en: "How much?", th: "เท่าไหร่", rom: "tâo rài", cat: "Phrases", lesson: 4, audio: "tao-rai.mp3" },
  { en: "How much is this?", th: "นี่เท่าไหร่", rom: "nêe tâo rài (kráp/ká)", cat: "Phrases", lesson: 10, audio: "nee-tao-rai-ka.mp3" },
  { en: "How much is that?", th: "นั่นเท่าไหร่", rom: "nân tâo rài (kráp/ká)", cat: "Phrases", lesson: 10, audio: "nan-tao-rai-ka.mp3" },
  { en: "How much is this one?", th: "อันนี้เท่าไหร่", rom: "an née tâo rài (kráp/ká)", cat: "Phrases", lesson: 10, audio: "an-nee-tao-rai-ka.mp3" },
  { en: "How much is that one?", th: "อันนั้นเท่าไหร่", rom: "an nán tâo rài (kráp/ká)", cat: "Phrases", lesson: 10, audio: "an-nan-tao-rai-ka.mp3" },
  { en: "Very expensive.", th: "แพงมาก", rom: "paeng mâak", cat: "Phrases", lesson: 10, audio: "paeng-maak.mp3" },
  { en: "Too expensive.", th: "แพงเกินไป", rom: "paeng gern bpai", cat: "Phrases", lesson: 10, audio: "paeng-gern-bpai.mp3" },
  { en: "too much; excessively", th: "เกินไป", rom: "gern bpai", cat: "Adverbs", lesson: 10, audio: "gern-bpai.mp3" },
  { en: "Can you lower (the price)?", th: "ลดได้ไหม", rom: "lót dâai măi (kráp/ká)", cat: "Phrases", lesson: 10, audio: "lot-daai-mai-ka.mp3" },
  { en: "to lower; reduce", th: "ลด", rom: "lót", cat: "Verbs", lesson: 10, audio: "lot.mp3" },
  { en: "can", th: "ได้", rom: "dâai", cat: "Function", lesson: 10, audio: "daai.mp3" },
  { en: "Can you speak English?", th: "พูดภาษาอังกฤษได้ไหม", rom: "pôot paa-săa ang-grìt dâai măi", cat: "Phrases", lesson: 10, audio: "poot-paasaa-angrit-daai-mai.mp3" },
  { en: "I can speak Thai a little bit.", th: "พูดภาษาไทยได้นิดหน่อย", rom: "pôot paa-săa thai dâai nít nòi", cat: "Phrases", lesson: 10, audio: "poot-paasaa-thai-daai-nit-noi.mp3" },
  { en: "to take; to bring", th: "เอา", rom: "ao", cat: "Verbs", lesson: 10, audio: "ao.mp3" },
  { en: "I take this.", th: "เอานี่", rom: "ao nêe", cat: "Phrases", lesson: 10, audio: "ao-nee.mp3" },
  { en: "I take that.", th: "เอานั่น", rom: "ao nân", cat: "Phrases", lesson: 10, audio: "ao-nan.mp3" },
  { en: "temple", th: "วัด", rom: "wát", cat: "Nouns", lesson: 10, audio: "wat.mp3" },
  { en: "airport", th: "สนามบิน", rom: "sà-năam bin", cat: "Nouns", lesson: 10, audio: "sa-naam-bin.mp3" },
  { en: "Turn left.", th: "เลี้ยวซ้าย", rom: "líeow sáai", cat: "Phrases", lesson: 10, audio: "lieow-saai.mp3" },
  { en: "Turn right.", th: "เลี้ยวขวา", rom: "líeow kwăa", cat: "Phrases", lesson: 10, audio: "lieow-kwaa.mp3" },
  { en: "to turn", th: "เลี้ยว", rom: "líeow", cat: "Verbs", lesson: 10, audio: "lieow.mp3" },
  { en: "left", th: "ซ้าย", rom: "sáai", cat: "Nouns", lesson: 10, audio: "saai.mp3" },
  { en: "right", th: "ขวา", rom: "kwăa", cat: "Nouns", lesson: 10, audio: "kwaa.mp3" },
  { en: "Go straight ahead.", th: "ตรงไป", rom: "dtrong bpai", cat: "Phrases", lesson: 10, audio: "dtrong-bpai.mp3" },
  { en: "Stop here.", th: "จอดตรงนี้", rom: "jòt dtrong née", cat: "Phrases", lesson: 10, audio: "jot-dtrong-nee.mp3" },
  { en: "Stop over there.", th: "จอดตรงนั้น", rom: "jòt dtrong nán", cat: "Phrases", lesson: 10, audio: "jot-dtrong-nan.mp3" },
  { en: "to stop; park", th: "จอด", rom: "jòt", cat: "Verbs", lesson: 10, audio: "jot.mp3" },
  { en: "market", th: "ตลาด", rom: "dtà-làat", cat: "Nouns", lesson: 10, audio: "dta-laat.mp3" },
  { en: "Where are you?", th: "อยู่ไหน", rom: "(kun) yòo năi", cat: "Phrases", lesson: 8, audio: "yoo-nai.mp3" },
  { en: "I'm at home.", th: "อยู่บ้าน", rom: "(pŏm/chăn) yòo bâan", cat: "Phrases", lesson: 8, audio: "yoo-baan.mp3" },
  { en: "I'm a teacher. (female)", th: "ฉันเป็นครู", rom: "chăn bpen kroo", cat: "Phrases", lesson: 8, audio: "chan-bpen-kroo.mp3" },
  { en: "I'm not a teacher. (male)", th: "ผมไม่ใช่ครู", rom: "pŏm mâi châi kroo", cat: "Phrases", lesson: 8, audio: "pom-mai-chai-kroo.mp3" },
  { en: "This is pork.", th: "นี่คือหมู", rom: "nêe keu mŏo", cat: "Phrases", lesson: 8, audio: "nee-keu-moo.mp3" },
  { en: "This is not pork.", th: "นี่ไม่ใช่หมู", rom: "nêe mâi châi mŏo", cat: "Phrases", lesson: 8, audio: "nee-mai-chai-moo.mp3" },
  { en: "He/she is American.", th: "เขาเป็นคนอเมริกัน", rom: "kăo bpen kon à-may-rí-gan", cat: "Phrases", lesson: 8, audio: "kao-bpen-kon-american.mp3" },
  { en: "He/she is not American.", th: "เขาไม่ใช่คนอเมริกัน", rom: "kăo mâi châi kon à-may-rí-gan", cat: "Phrases", lesson: 8, audio: "kao-mai-chai-kon-american.mp3" },
  { en: "drink; beverage", th: "เครื่องดื่ม", rom: "krêuang dèum", cat: "Nouns", lesson: 10, audio: "kreuang-deum.mp3" },
  { en: "Can I try it on?", th: "ลองได้ไหม", rom: "long dâai măi", cat: "Phrases", lesson: 10, audio: "long-daai-mai.mp3" },
  { en: "to try", th: "ลอง", rom: "long", cat: "Verbs", lesson: 10, audio: "long.mp3" },
  { en: "(1) of; belonging (2) thing", th: "ของ", rom: "kŏng", cat: "Nouns", lesson: 11, audio: "kong.mp3" },
  { en: "father", th: "พ่อ", rom: "pôr", cat: "Nouns", lesson: 11, audio: "por.mp3" },
  { en: "mother", th: "แม่", rom: "mâe", cat: "Nouns", lesson: 11, audio: "mae.mp3" },
  { en: "parents", th: "พ่อแม่", rom: "pôr mâe", cat: "Nouns", lesson: 11, audio: "por-mae.mp3" },
  { en: "child", th: "ลูก", rom: "lôok", cat: "Nouns", lesson: 11, audio: "look.mp3" },
  { en: "wife", th: "ภรรยา", rom: "pan-rá-yaa", cat: "Nouns", lesson: 11, audio: "panrayaa.mp3" },
  { en: "husband", th: "สามี", rom: "săa-mee", cat: "Nouns", lesson: 11, audio: "saamee.mp3" },
  { en: "wifey (informal)", th: "เมีย", rom: "mia", cat: "Nouns", lesson: 11, audio: "mia.mp3" },
  { en: "hubby (informal)", th: "ผัว", rom: "pŭa", cat: "Nouns", lesson: 11, audio: "pua.mp3" },
  { en: "girlfriend; boyfriend", th: "แฟน", rom: "faen", cat: "Nouns", lesson: 11, audio: "faen.mp3" },
  { en: "friend", th: "เพื่อน", rom: "pêuan", cat: "Nouns", lesson: 11, audio: "peuan.mp3" },
  { en: "wallet", th: "กระเป๋าตังค์", rom: "grà-bpăo dtang", cat: "Nouns", lesson: 11, audio: "gra-bpao-dtaang.mp3" },
  { en: "fast", th: "เร็ว", rom: "reo", cat: "Adjectives", lesson: 11, audio: "reo.mp3" },
  { en: "slow", th: "ช้า", rom: "cháa", cat: "Adjectives", lesson: 11, audio: "chaa.mp3" },
  { en: "key", th: "กุญแจ", rom: "gun-jae", cat: "Nouns", lesson: 11, audio: "gun-jae.mp3" },
  { en: "to leave or keep something in a place", th: "ไว้ / ไว้ใน", rom: "wái (nai)", cat: "Verbs", lesson: 11, audio: "wai.mp3" },
  { en: "in (preposition)", th: "ใน", rom: "nai", cat: "Function", lesson: 11, audio: "nai-in.mp3" },
  { en: "sometimes", th: "บางที", rom: "baang-tee", cat: "Adverbs", lesson: 13, audio: "bang-tee.mp3" },
  { en: "often", th: "บ่อย ๆ", rom: "bòi bòi", cat: "Adverbs", lesson: 13, audio: "boi-boi.mp3" },
  { en: "not really; not much", th: "ไม่ค่อย", rom: "mâi kôi", cat: "Phrases", lesson: 11, audio: "mai-koi.mp3" },
  { en: "...or not?", th: "หรือเปล่า", rom: "rĕu bplào", cat: "Function", lesson: 11, audio: "reu-bplao.mp3" },
  { en: "room", th: "ห้อง", rom: "hông", cat: "Nouns", lesson: 8, audio: "hong.mp3" },
  { en: "Whose is this?", th: "อันนี้ของใคร", rom: "an née kŏng krai", cat: "Phrases", lesson: 11, audio: "an-nee-kong-krai.mp3" },
  { en: "family", th: "ครอบครัว", rom: "krôp krua", cat: "Nouns", lesson: 11, audio: "krop-krua.mp3" },
  { en: "son", th: "ลูกชาย", rom: "lôok chaai", cat: "Nouns", lesson: 11, audio: "look-chai.mp3" },
  { en: "daughter", th: "ลูกสาว", rom: "lôok săao", cat: "Nouns", lesson: 11, audio: "look-saao.mp3" },
  { en: "sibling", th: "พี่น้อง", rom: "pêe nóng", cat: "Nouns", lesson: 11, audio: "pee-nong.mp3" },
  { en: "elder brother", th: "พี่ชาย", rom: "pêe chaai", cat: "Nouns", lesson: 11, audio: "pee-chaai.mp3" },
  { en: "younger brother", th: "น้องชาย", rom: "nóng chaai", cat: "Nouns", lesson: 11, audio: "nong-chaai.mp3" },
  { en: "elder sister", th: "พี่สาว", rom: "pêe săao", cat: "Nouns", lesson: 11, audio: "pee-saao.mp3" },
  { en: "younger sister", th: "น้องสาว", rom: "nóng săao", cat: "Nouns", lesson: 11, audio: "nong-saao.mp3" },
  { en: "grandfather (paternal)", th: "ปู่", rom: "bpòo", cat: "Nouns", lesson: 11, audio: "bpoo.mp3" },
  { en: "grandmother (paternal)", th: "ย่า", rom: "yâa", cat: "Nouns", lesson: 11, audio: "yaa-grandmother.mp3" },
  { en: "grandfather (maternal)", th: "ตา", rom: "dtaa", cat: "Nouns", lesson: 11, audio: "dtaa.mp3" },
  { en: "grandmother (maternal)", th: "ยาย", rom: "yaai", cat: "Nouns", lesson: 11, audio: "yaai.mp3" },
  { en: "to have", th: "มี", rom: "mee", cat: "Verbs", lesson: 12, audio: "mee.mp3" },
  { en: "do not have", th: "ไม่มี", rom: "mâi mee", cat: "Verbs", lesson: 12, audio: "mai-mee.mp3" },
  { en: "pen", th: "ปากกา", rom: "bpàak gaa", cat: "Nouns", lesson: 12, audio: "bpaak-gaa.mp3" },
  { en: "time", th: "เวลา", rom: "way-laa", cat: "Nouns", lesson: 12, audio: "way-laa.mp3" },
  { en: "money", th: "เงิน", rom: "ngern", cat: "Nouns", lesson: 12, audio: "ngern.mp3" },
  { en: "money (informal)", th: "ตังค์", rom: "dtang", cat: "Nouns", lesson: 12, audio: "dtang.mp3" },
  { en: "question", th: "คำถาม", rom: "kam tăam", cat: "Nouns", lesson: 12, audio: "kam-taam.mp3" },
  { en: "appointment", th: "นัด", rom: "nát", cat: "Nouns", lesson: 12, audio: "nat.mp3" },
  { en: "to hold a meeting", th: "ประชุม", rom: "bprà-chum", cat: "Verbs", lesson: 12, audio: "bpra-chum.mp3" },
  { en: "important", th: "สำคัญ", rom: "săm-kan", cat: "Adjectives", lesson: 12, audio: "sam-kan.mp3" },
  { en: "car, vehicle (classifier)", th: "คัน", rom: "kan", cat: "Classifiers", lesson: 12, audio: "kan.mp3" },
  { en: "person; classifier for people", th: "คน", rom: "kon", cat: "Classifiers", lesson: 12, audio: "kon.mp3" },
  { en: "animal (classifier)", th: "ตัว", rom: "dtua", cat: "Classifiers", lesson: 12, audio: "dtua.mp3" },
  { en: "house (classifier)", th: "หลัง", rom: "lăng", cat: "Classifiers", lesson: 12, audio: "lang.mp3" },
  { en: "small object (classifier)", th: "อัน", rom: "an", cat: "Classifiers", lesson: 12, audio: "an.mp3" },
  { en: "public bus", th: "รถเมล์", rom: "rót may", cat: "Nouns", lesson: 12, audio: "rot-may.mp3" },
  { en: "coach bus; intercity bus", th: "รถบัส", rom: "rót bàt", cat: "Nouns", lesson: 12, audio: "rot-bat.mp3" },
  { en: "rich", th: "รวย", rom: "ruay", cat: "Adjectives", lesson: 12, audio: "ruay.mp3" },
  { en: "How many? How much?", th: "กี่", rom: "gèe", cat: "Function", lesson: 12, audio: "gee.mp3" },
  { en: "Farewell.", th: "ลาก่อน", rom: "laa gòn", cat: "Phrases", lesson: 12, audio: "laa-gon.mp3" },
  { en: "Do you have a smaller size?", th: "คุณมีเล็กกว่านี้ไหม", rom: "kun mee lék gwàa née măi", cat: "Phrases", lesson: 12, audio: "kun-mee-lek-gwaa.mp3" },
  { en: "Do you have a bigger size?", th: "คุณมีใหญ่กว่านี้ไหม", rom: "kun mee yài gwàa née măi", cat: "Phrases", lesson: 12, audio: "kun-mee-yai-gwaa.mp3" },
  { en: "Have you eaten yet?", th: "กินข้าวหรือยัง", rom: "gin kâao rĕu yang", cat: "Phrases", lesson: 12, audio: "gin-kaao-reu-yang-ka.mp3" },
  { en: "I've already eaten.", th: "กินแล้ว", rom: "gin láew", cat: "Phrases", lesson: 12, audio: "gin-laew-ka.mp3" },
  { en: "I haven't eaten yet.", th: "ยังไม่ได้กิน", rom: "yang mâi dâai gin", cat: "Phrases", lesson: 12, audio: "yang-mai-daai-gin-ka.mp3" },
  { en: "more; more than", th: "กว่า", rom: "gwàa", cat: "Adverbs", lesson: 12, audio: "gwaa.mp3" },
  { en: "small", th: "เล็ก", rom: "lék", cat: "Adjectives", lesson: 12, audio: "lek.mp3" },
  { en: "big", th: "ใหญ่", rom: "yài", cat: "Adjectives", lesson: 11, audio: "yai.mp3" },
  { en: "smaller", th: "เล็กกว่า", rom: "lék gwàa", cat: "Phrases", lesson: 12, audio: "lek-gwaa.mp3" },
  { en: "bigger", th: "ใหญ่กว่า", rom: "yài gwàa", cat: "Phrases", lesson: 12, audio: "yai-gwaa.mp3" },
  { en: "better", th: "ดีกว่า", rom: "dee gwàa", cat: "Phrases", lesson: 12, audio: "dee-gwaa.mp3" },
  { en: "this one", th: "อันนี้", rom: "an née", cat: "Phrases", lesson: 10, audio: "an-nee.mp3" },
  { en: "that one", th: "อันนั้น", rom: "an nán", cat: "Phrases", lesson: 10, audio: "an-nan.mp3" },
  // ===== Lessons 13-15 additions (+ Lesson 9 'unfortunate') =====
  { en: "to ask for; to request", th: "ขอ", rom: "kŏr", cat: "Verbs", lesson: 13, audio: "kor.mp3" },
  { en: "I would like the menu.", th: "ขอเมนู", rom: "kŏr may-noo", cat: "Phrases", lesson: 13, audio: "kor-maynoo-ka.mp3" },
  { en: "shrimp", th: "กุ้ง", rom: "gûng", cat: "Nouns", lesson: 13, audio: "gung.mp3" },
  { en: "papaya salad", th: "ส้มตำ", rom: "sôm dtam", cat: "Nouns", lesson: 13, audio: "som-dtam.mp3" },
  { en: "stir fried basil (chicken)", th: "ผัดกะเพราไก่", rom: "pàt gà prao gài", cat: "Nouns", lesson: 13, audio: "pat-ga-prao-gai.mp3" },
  { en: "stir fried basil (pork)", th: "ผัดกะเพราหมู", rom: "pàt gà prao mŏo", cat: "Nouns", lesson: 13, audio: "pat-ga-prao-moo.mp3" },
  { en: "stir fried soy sauce noodles", th: "ผัดซีอิ๊ว", rom: "pàt-see-íw", cat: "Nouns", lesson: 13, audio: "pad-see-ew.mp3" },
  { en: "noodle soup; noodle", th: "ก๋วยเตี๋ยว", rom: "gŭay-dtĭeow", cat: "Nouns", lesson: 13, audio: "kuay-dtieow.mp3" },
  { en: "to return home; for takeaway", th: "กลับบ้าน", rom: "glàp bâan", cat: "Phrases", lesson: 13, audio: "glap-baan.mp3" },
  { en: "plate, dish (classifier)", th: "จาน", rom: "jaan", cat: "Classifiers", lesson: 13, audio: "jaan.mp3" },
  { en: "bowl (classifier)", th: "ชาม", rom: "chaam", cat: "Classifiers", lesson: 13, audio: "chaam.mp3" },
  { en: "small bowl (classifier)", th: "ถ้วย", rom: "tûay", cat: "Classifiers", lesson: 13, audio: "tuay.mp3" },
  { en: "cup, glass (classifier)", th: "แก้ว", rom: "gâew", cat: "Classifiers", lesson: 13, audio: "gaew.mp3" },
  { en: "bottle (classifier)", th: "ขวด", rom: "kùat", cat: "Classifiers", lesson: 13, audio: "kuat.mp3" },
  { en: "bag (classifier)", th: "ถุง", rom: "tŭng", cat: "Classifiers", lesson: 13, audio: "tung.mp3" },
  { en: "box (classifier)", th: "กล่อง", rom: "glòng", cat: "Classifiers", lesson: 13, audio: "glong.mp3" },
  { en: "elephant", th: "ช้าง", rom: "cháng", cat: "Nouns", lesson: 13, audio: "chang.mp3" },
  { en: "red wine", th: "ไวน์แดง", rom: "wai daeng", cat: "Nouns", lesson: 13, audio: "wai-daeng.mp3" },
  { en: "red", th: "แดง", rom: "daeng", cat: "Adjectives", lesson: 13, audio: "daeng.mp3" },
  { en: "green", th: "เขียว", rom: "kĭeow", cat: "Adjectives", lesson: 13, audio: "kieow.mp3" },
  { en: "rice; meal", th: "ข้าว", rom: "kâao", cat: "Nouns", lesson: 4, audio: "kaao-rice.mp3" },
  { en: "steamed rice", th: "ข้าวสวย", rom: "kâao sŭay", cat: "Nouns", lesson: 13, audio: "kaao-suay.mp3" },
  { en: "sticky rice", th: "ข้าวเหนียว", rom: "kâao nĭeow", cat: "Nouns", lesson: 13, audio: "kaao-nieow.mp3" },
  { en: "sweet", th: "หวาน", rom: "wăan", cat: "Adjectives", lesson: 13, audio: "waan.mp3" },
  { en: "curry; stew", th: "แกง", rom: "gaeng", cat: "Nouns", lesson: 13, audio: "gaeng.mp3" },
  { en: "green curry", th: "แกงเขียวหวาน", rom: "gaeng kĭeow wăan", cat: "Nouns", lesson: 13, audio: "gaeng-kieow-waan.mp3" },
  { en: "mango sticky rice", th: "ข้าวเหนียวมะม่วง", rom: "kâao nĭeow má-mûang", cat: "Nouns", lesson: 13, audio: "kaao-nieow-ma-muang.mp3" },
  { en: "mango", th: "มะม่วง", rom: "má-mûang", cat: "Nouns", lesson: 13, audio: "ma-muang.mp3" },
  { en: "(1) to be allergic to; (2) to lose", th: "แพ้", rom: "páe", cat: "Verbs", lesson: 13, audio: "pae.mp3" },
  { en: "The bill please.", th: "เช็คบิล", rom: "chék bin", cat: "Phrases", lesson: 13, audio: "chek-bin.mp3" },
  { en: "Looks tasty.", th: "น่ากิน", rom: "nâa gin", cat: "Phrases", lesson: 9, audio: "naa-gin.mp3" },
  { en: "Cheers.", th: "ชนแก้ว", rom: "chon gâew", cat: "Phrases", lesson: 13, audio: "chon-gaew.mp3" },
  { en: "Enjoy your meal.", th: "กินให้อร่อยนะ", rom: "gin hâi à-ròi ná", cat: "Phrases", lesson: 13, audio: "gin-hai-aroi-na.mp3" },
  { en: "I'm full.", th: "อิ่มแล้ว", rom: "ìm láew", cat: "Phrases", lesson: 13, audio: "im-laew.mp3" },
  { en: "That's enough.", th: "พอแล้ว", rom: "por láew", cat: "Phrases", lesson: 13, audio: "por-laew-ka.mp3" },
  { en: "Wanna try/taste? (food)", th: "ชิมไหม", rom: "chim măi", cat: "Phrases", lesson: 13, audio: "chim-mai.mp3" },
  { en: "Can I have some? (food)", th: "ขอชิมหน่อย", rom: "kŏr chim nòi", cat: "Phrases", lesson: 13, audio: "kor-chim-noi.mp3" },
  { en: "will (future tense marker)", th: "จะ", rom: "jà", cat: "Function", lesson: 7, audio: "ja.mp3" },
  { en: "tonight", th: "คืนนี้", rom: "keun née", cat: "Adverbs", lesson: 7, audio: "keun-nee.mp3" },
  { en: "to meet", th: "เจอ", rom: "jer", cat: "Verbs", lesson: 14, audio: "jer.mp3" },
  { en: "new", th: "ใหม่", rom: "mài", cat: "Adjectives", lesson: 14, audio: "mai-new.mp3" },
  { en: "to call someone", th: "โทรหา", rom: "toh hăa", cat: "Verbs", lesson: 14, audio: "toh-haa.mp3" },
  { en: "to visit someone", th: "ไปเยี่ยม", rom: "bpai yîam", cat: "Verbs", lesson: 14, audio: "bpai-yiam.mp3" },
  { en: "to text someone", th: "ส่งข้อความหา", rom: "sòng kôr kwaam hăa", cat: "Verbs", lesson: 14, audio: "song-kor-kwaam-haa.mp3" },
  { en: "with", th: "กับ", rom: "gàp", cat: "Function", lesson: 14, audio: "gap.mp3" },
  { en: "today", th: "วันนี้", rom: "wan née", cat: "Adverbs", lesson: 7, audio: "wan-nee.mp3" },
  { en: "tomorrow", th: "พรุ่งนี้", rom: "prûng-née", cat: "Adverbs", lesson: 7, audio: "prung-nee.mp3" },
  { en: "next week", th: "อาทิตย์หน้า", rom: "aa-tít nâa", cat: "Adverbs", lesson: 14, audio: "aa-tit-naa.mp3" },
  { en: "next month", th: "เดือนหน้า", rom: "deuan nâa", cat: "Adverbs", lesson: 14, audio: "deuan-naa.mp3" },
  { en: "next year", th: "ปีหน้า", rom: "bpee nâa", cat: "Adverbs", lesson: 14, audio: "bpee-naa.mp3" },
  { en: "day", th: "วัน", rom: "wan", cat: "Nouns", lesson: 14, audio: "wan.mp3" },
  { en: "week", th: "อาทิตย์", rom: "aa-tít", cat: "Nouns", lesson: 14, audio: "aa-tit.mp3" },
  { en: "month", th: "เดือน", rom: "deuan", cat: "Nouns", lesson: 14, audio: "deuan.mp3" },
  { en: "alone", th: "คนเดียว", rom: "kon dieow", cat: "Adverbs", lesson: 14, audio: "kon-dieow.mp3" },
  { en: "seafood", th: "อาหารทะเล", rom: "aa hăan tá-lay", cat: "Nouns", lesson: 14, audio: "aa-haan-ta-lay.mp3" },
  { en: "sea; ocean", th: "ทะเล", rom: "tá-lay", cat: "Nouns", lesson: 14, audio: "ta-lay.mp3" },
  { en: "city", th: "เมือง", rom: "meuang", cat: "Nouns", lesson: 14, audio: "mueang.mp3" },
  { en: "loud; noisy", th: "เสียงดัง", rom: "sĭang dang", cat: "Adjectives", lesson: 14, audio: "siang-dang.mp3" },
  { en: "annoying", th: "น่ารำคาญ", rom: "nâa ram-kaan", cat: "Adjectives", lesson: 14, audio: "naa-ram-kaan.mp3" },
  { en: "Have fun.", th: "ขอให้สนุกนะ", rom: "kŏr hâi sà-nùk ná", cat: "Phrases", lesson: 14, audio: "kor-hai-sanuk-na.mp3" },
  { en: "Have a nice trip.", th: "เที่ยวให้สนุกนะ", rom: "tîeow hâi sà-nùk ná", cat: "Phrases", lesson: 14, audio: "tieow-hai-sanuk-na.mp3" },
  { en: "Which city do you live in?", th: "คุณอยู่เมืองไหน", rom: "kun yòo meuang năi", cat: "Phrases", lesson: 14, audio: "kun-yoo-mueang-nai.mp3" },
  { en: "Monday", th: "วันจันทร์", rom: "wan jan", cat: "Days and Months", lesson: 14, audio: "wan-jan.mp3" },
  { en: "Tuesday", th: "วันอังคาร", rom: "wan ang-kaan", cat: "Days and Months", lesson: 14, audio: "wan-ang-kaan.mp3" },
  { en: "Wednesday", th: "วันพุธ", rom: "wan pút", cat: "Days and Months", lesson: 14, audio: "wan-put.mp3" },
  { en: "Thursday", th: "วันพฤหัสบดี", rom: "wan pá-réu-hàt-sà-bor-dee", cat: "Days and Months", lesson: 14, audio: "wan-pareuhat.mp3" },
  { en: "Friday", th: "วันศุกร์", rom: "wan sùk", cat: "Days and Months", lesson: 14, audio: "wan-suk.mp3" },
  { en: "Saturday", th: "วันเสาร์", rom: "wan săo", cat: "Days and Months", lesson: 14, audio: "wan-sao.mp3" },
  { en: "Sunday", th: "วันอาทิตย์", rom: "wan aa-tít", cat: "Days and Months", lesson: 14, audio: "wan-aa-tit.mp3" },
  { en: "Weekend", th: "เสาร์อาทิตย์", rom: "săo aa-tít", cat: "Days and Months", lesson: 14, audio: "sao-aa-tit.mp3" },
  { en: "to want", th: "อยาก", rom: "yàak", cat: "Verbs", lesson: 15, audio: "yaak-want.mp3" },
  { en: "to travel; to hang out", th: "ไปเที่ยว", rom: "bpai tîeow", cat: "Verbs", lesson: 15, audio: "bpai-tieow.mp3" },
  { en: "culture", th: "วัฒนธรรม", rom: "wát-tá-ná-tam", cat: "Nouns", lesson: 15, audio: "wat-ta-na-tam.mp3" },
  { en: "interesting", th: "น่าสนใจ", rom: "nâa sŏn jai", cat: "Adjectives", lesson: 15, audio: "naa-son-jai.mp3" },
  { en: "black", th: "สีดำ", rom: "sĕe dam", cat: "Adjectives", lesson: 15, audio: "see-dam.mp3" },
  { en: "shoes", th: "รองเท้า", rom: "rong táo", cat: "Nouns", lesson: 15, audio: "rong-tao.mp3" },
  { en: "T-shirt", th: "เสื้อยืด", rom: "sêua yêut", cat: "Nouns", lesson: 15, audio: "seua-yeut.mp3" },
  { en: "story; matter; topic (classifier)", th: "เรื่อง", rom: "rêuang", cat: "Classifiers", lesson: 15, audio: "reuang.mp3" },
  { en: "lonely", th: "เหงา", rom: "ngăo", cat: "Adjectives", lesson: 15, audio: "ngao.mp3" },
  { en: "strong; fit", th: "แข็งแรง", rom: "kăeng raeng", cat: "Adjectives", lesson: 15, audio: "kaeng-raeng.mp3" },
  { en: "must; have to", th: "ต้อง", rom: "dtông", cat: "Adverbs", lesson: 15, audio: "dtong.mp3" },
  { en: "boss", th: "เจ้านาย", rom: "jâo naai", cat: "Nouns", lesson: 15, audio: "jao-naai.mp3" },
  { en: "to wake up", th: "ตื่น", rom: "dtèun", cat: "Verbs", lesson: 15, audio: "dteun.mp3" },
  { en: "morning", th: "เช้า", rom: "cháo", cat: "Nouns", lesson: 14, audio: "chao.mp3" },
  { en: "early morning", th: "แต่เช้า", rom: "dtàe cháo", cat: "Adverbs", lesson: 15, audio: "dtae-chao.mp3" },
  { en: "nature", th: "ธรรมชาติ", rom: "tam-má-châat", cat: "Nouns", lesson: 15, audio: "tam-ma-chaat.mp3" },
  { en: "for; in order to", th: "เพื่อ", rom: "pêua", cat: "Function", lesson: 15, audio: "peua.mp3" },
  { en: "Good idea.", th: "เป็นความคิดที่ดี", rom: "bpen kwaam kít têe dee", cat: "Phrases", lesson: 15, audio: "bpen-kwaam-kit-tee-dee.mp3" },
  { en: "idea; thought", th: "ความคิด", rom: "kwaam kít", cat: "Nouns", lesson: 15, audio: "kwaam-kit.mp3" },
  { en: "to search for", th: "หา", rom: "hăa", cat: "Verbs", lesson: 15, audio: "haa-search.mp3" },
  { en: "What are you looking for?", th: "คุณหาอะไร", rom: "kun hăa à-rai", cat: "Phrases", lesson: 15, audio: "kun-haa-arai.mp3" },
  { en: "together", th: "ด้วยกัน", rom: "dûay gan", cat: "Adverbs", lesson: 15, audio: "duay-gan.mp3" },
  { en: "to massage", th: "นวด", rom: "nûat", cat: "Verbs", lesson: 15, audio: "nuat.mp3" },
  { en: "Thai massage", th: "นวดไทย", rom: "nûat thai", cat: "Nouns", lesson: 15, audio: "nuat-thai.mp3" },
  { en: "to stop", th: "หยุด", rom: "yùt", cat: "Verbs", lesson: 15, audio: "yut.mp3" },
  { en: "holiday; day off", th: "วันหยุด", rom: "wan yùt", cat: "Nouns", lesson: 15, audio: "wan-yut.mp3" },
  { en: "to choose", th: "เลือก", rom: "lêuak", cat: "Verbs", lesson: 15, audio: "leuak.mp3" },
  { en: "hot season", th: "หน้าร้อน", rom: "nâa rón", cat: "Nouns", lesson: 15, audio: "naa-ron.mp3" },
  { en: "rainy season", th: "หน้าฝน", rom: "nâa fŏn", cat: "Nouns", lesson: 15, audio: "naa-fon.mp3"  },
  { en: "cold season", th: "หน้าหนาว", rom: "nâa năao", cat: "Nouns", lesson: 15, audio: "naa-naao.mp3"  },
  { en: "to want to get; want to have", th: "อยากได้", rom: "yàak dâai", cat: "Phrases", lesson: 15, audio: "yaak-daai.mp3" },
  { en: "to need; to require", th: "ต้องการ", rom: "dtông gaan", cat: "Verbs", lesson: 15, audio: "dtong-gaan.mp3" },
  { en: "birthday", th: "วันเกิด", rom: "wan gèrt", cat: "Nouns", lesson: 15, audio: "wan-gert.mp3" },
  { en: "museum", th: "พิพิธภัณฑ์", rom: "pí-pít-tá-pan", cat: "Nouns", lesson: 15, audio: "pi-pit-ta-pan.mp3" },
  { en: "help; assistance", th: "ความช่วยเหลือ", rom: "kwaam chûay lĕua", cat: "Nouns", lesson: 15, audio: "kwaam-chuay-leua.mp3" },
  { en: "to help", th: "ช่วย", rom: "chûay", cat: "Verbs", lesson: 15, audio: "chuay.mp3" },
  { en: "Can you say it again?", th: "พูดอีกครั้งได้ไหม", rom: "pôot èek kráng dâai măi", cat: "Phrases", lesson: 15, audio: "poot-eek-krang-daai-mai.mp3" },
  { en: "Can you speak slowly?", th: "พูดช้าๆ ได้ไหม", rom: "pôot cháa cháa dâai măi", cat: "Phrases", lesson: 15, audio: "poot-cha-cha-daai-mai.mp3" },
  { en: "How?", th: "อย่างไร", rom: "yàng rai", cat: "Phrases", lesson: 15, audio: "yang-rai.mp3" },
  { en: "How? (casual)", th: "ยังไง", rom: "yang ngai", cat: "Function", lesson: 15, audio: "yang-ngai.mp3" },
  { en: "to think (that)", th: "คิดว่า", rom: "kít wâa", cat: "Verbs", lesson: 15, audio: "kit-waa.mp3" },
  { en: "What do you think? (formal)", th: "คุณคิดอย่างไร", rom: "kun kít yàng rai", cat: "Phrases", lesson: 15, audio: "kun-kit-yang-rai.mp3" },
  { en: "What do you think? (casual)", th: "คิดยังไง", rom: "kít yang ngai", cat: "Phrases", lesson: 15, audio: "kit-yang-ngai.mp3" },
  { en: "fine", th: "ก็ได้", rom: "gôr dâai", cat: "Phrases", lesson: 15, audio: "gor-daai.mp3" },
  { en: "Anything's fine.", th: "อะไรก็ได้", rom: "à-rai gôr dâai", cat: "Phrases", lesson: 15, audio: "arai-gor-daai.mp3" },
  { en: "about; regarding", th: "เกี่ยวกับ", rom: "gìeow gàp", cat: "Function", lesson: 15, audio: "gieow-gap.mp3" },
  // ===== Lessons 16 additions =====
  { en: "older sibling; older person", th: "พี่", rom: "pêe", cat: "Nouns", lesson: 16 },
  { en: "younger sibling; younger person", th: "น้อง", rom: "nóng", cat: "Nouns", lesson: 16 },
  { en: "I / me (child); you (to a child)", th: "หนู", rom: "nŏo", cat: "Pronouns", lesson: 4, audio: "noo.mp3" },
  { en: "to start; begin", th: "เริ่ม", rom: "rêrm", cat: "Verbs", lesson: 16, audio: "rerm.mp3" },
  { en: "ready; prepared", th: "พร้อม", rom: "próm", cat: "Adjectives", lesson: 16, audio: "prom.mp3" },
  { en: "to open", th: "เปิด", rom: "bpèrt", cat: "Verbs", lesson: 16, audio: "bpert.mp3" },
  { en: "to close", th: "ปิด", rom: "bpìt", cat: "Verbs", lesson: 16, audio: "bpit.mp3" },
  { en: "to clean", th: "ทำความสะอาด", rom: "tam kwaam sà-àat", cat: "Verbs", lesson: 16, audio: "tam-kwaam-sa-aat.mp3" },
  { en: "to clean the house", th: "ทำความสะอาดบ้าน", rom: "tam kwaam sà-àat bâan", cat: "Verbs", lesson: 16, audio: "tam-kwaam-baan.mp3" },
  { en: "late (at night)", th: "ดึก", rom: "dèuk", cat: "Adjectives", lesson: 16, audio: "deuk.mp3" },
  { en: "now", th: "ตอนนี้", rom: "dton-née", cat: "Adverbs", lesson: 16, audio: "dton-nee.mp3" },
  { en: "soon; recently", th: "เร็ว ๆ นี้", rom: "reo reo née", cat: "Adverbs", lesson: 16, audio: "reo-reo-nee.mp3" },
  { en: "about; around", th: "ประมาณ", rom: "bprà-maan", cat: "Adverbs", lesson: 16, audio: "bpra-maan.mp3" },
  { en: "too; as well", th: "ด้วย", rom: "dûay", cat: "Adverbs", lesson: 15, audio: "duay.mp3" },
  { en: "usually; normally", th: "ปกติ", rom: "bpòk-gà-dtì", cat: "Adverbs", lesson: 16, audio: "bpok-ga-dti.mp3" },
  { en: "How's it going?; What's up?", th: "เป็นยังไงบ้าง", rom: "bpen yang ngai bâang", cat: "Phrases", lesson: 16 },
  { en: "What's up?; Sup?", th: "ว่าไง", rom: "wâa ngai", cat: "Phrases", lesson: 16, audio: "waa-ngai.mp3" },
  { en: "Let's ...", th: "กันเถอะ", rom: "gan tùh", cat: "Phrases", lesson: 16, audio: "gan-ter.mp3" },
  { en: "me too; I feel the same", th: "ก็เหมือนกัน", rom: "gôr mĕuan gan", cat: "Phrases", lesson: 16, audio: "gor-meuan-gan.mp3" },
  { en: "Get well soon.", th: "หายไว ๆ นะ", rom: "hăai wai wai ná", cat: "Phrases", lesson: 16, audio: "haai-wai-wai-na.mp3" },
  { en: "Get plenty of rest.", th: "พักผ่อนเยอะ ๆ นะ", rom: "pák pòn yúh yúh ná", cat: "Phrases", lesson: 16, audio: "pak-pon-yuk-yuk-na.mp3" },
  { en: "minute", th: "นาที", rom: "naa tee", cat: "Nouns", lesson: 16, audio: "naa-tee.mp3" },
  { en: "hour", th: "ชั่วโมง", rom: "chûa-mohng", cat: "Nouns", lesson: 16, audio: "chua-mohng.mp3" },
  { en: "See you in 30 minutes.", th: "เจอกันอีกสามสิบนาที", rom: "jer gan èek săam-sìp naa-tee", cat: "Phrases", lesson: 16, audio: "jer-gan-eek-saam.mp3" },
  { en: "I'll finish in 2 hours.", th: "อีกสองชั่วโมงจะเสร็จ", rom: "èek sŏng chûa-mohng jà sèt", cat: "Phrases", lesson: 16, audio: "eek-song-chua.mp3" },
  { en: "so-so; nothing special", th: "เฉย ๆ", rom: "chŏie chŏie", cat: "Phrases", lesson: 16 },
  { en: "Same as usual.", th: "เรื่อย ๆ", rom: "rêuay rêuay", cat: "Phrases", lesson: 16, audio: "reuay-reuay.mp3" },
  { en: "Hi. (casual)", th: "หวัดดี", rom: "wàt dee", cat: "Phrases", lesson: 16, audio: "wat-dee.mp3" },
  { en: "of course", th: "แน่นอน", rom: "nâe-non", cat: "Phrases", lesson: 16, audio: "nae-non.mp3" },
  { en: "Be right back.", th: "เดี๋ยวมา", rom: "dĭeow maa", cat: "Phrases", lesson: 15, audio: "dieow-maa.mp3" },
  { en: "No need to rush.", th: "ไม่ต้องรีบ", rom: "mâi dtông rêep", cat: "Phrases", lesson: 15, audio: "mai-dtong-reep.mp3" },
  { en: "to rush; hurry", th: "รีบ", rom: "rêep", cat: "Verbs", lesson: 15, audio: "reep.mp3" },
  { en: "Calm down; Take it easy.", th: "ใจเย็น ๆ", rom: "jai yen yen", cat: "Phrases", lesson: 101 },
  { en: "Take care.", th: "ดูแลตัวเองนะ", rom: "doo lae dtua-eng ná", cat: "Phrases", lesson: 101 },
  { en: "Long time no see.", th: "ไม่ได้เจอกันนานเลยนะ", rom: "mâi dâai jer gan naan loie ná", cat: "Phrases", lesson: 101 },
  { en: "That's correct.", th: "ถูกต้อง", rom: "tòok dtông", cat: "Phrases", lesson: 101 },
  { en: "Exactly!", th: "นั่นน่ะสิ", rom: "nân nâ sì", cat: "Phrases", lesson: 101 },
  { en: "I'm not sure.", th: "ไม่แน่ใจ", rom: "mâi nâe jai", cat: "Phrases", lesson: 101 },
  { en: "darling", th: "ที่รัก", rom: "têe rák", cat: "Nouns", lesson: 16, audio: "tee-rak.mp3" },
  { en: "pet", th: "สัตว์เลี้ยง", rom: "sàt líang", cat: "Nouns", lesson: 16, audio: "sat-liang.mp3" },
  { en: "actor", th: "นักแสดง", rom: "nák-sà-daeng", cat: "Nouns", lesson: 16, audio: "nak-sa-daeng.mp3" },
  { en: "again; more; in (time)", th: "อีก", rom: "èek", cat: "Function", lesson: 16, audio: "eek.mp3" },
  { en: "time; occasion (e.g. 'two times')", th: "ครั้ง", rom: "kráng", cat: "Nouns", lesson: 16, audio: "krang.mp3" },
  { en: "last few days", th: "สองสามวันนี้", rom: "sŏng săam wan née", cat: "Nouns", lesson: 16, audio: "song-saam-wan-nee.mp3" },
  { en: "a lot; much", th: "เยอะ", rom: "yúh", cat: "Adverbs", lesson: 16, audio: "yuh.mp3" },
  { en: "Look!", th: "ดูสิ", rom: "doo sì", cat: "Phrases", lesson: 8, audio: "doo-si.mp3" },
  { en: "scary", th: "น่ากลัว", rom: "nâa glua", cat: "Adjectives", lesson: 9, audio: "naa-glua.mp3" },
  { en: "not at all", th: "ไม่เลย", rom: "mâi loie", cat: "Phrases", lesson: 16, audio: "mai-loie.mp3" },
  { en: "it is raining", th: "ฝนตก", rom: "fŏn-dtòk", cat: "Phrases", lesson: 16, audio: "fon-dtok.mp3" },
  { en: "to miss", th: "คิดถึง", rom: "kít tĕung", cat: "Verbs", lesson: 9, audio: "kit-teung.mp3" },
  { en: "very much; really", th: "จัง", rom: "jang", cat: "Adverbs", lesson: 9, audio: "jang.mp3" },
  { en: "to feel", th: "รู้สึก", rom: "róo sèuk", cat: "Verbs", lesson: 16, audio: "roo-seuk.mp3" },
  { en: "terrible; awful", th: "แย่", rom: "yâe", cat: "Adjectives", lesson: 16, audio: "yae.mp3" },
  { en: "sick; ill", th: "ป่วย", rom: "bpùay", cat: "Adjectives", lesson: 16, audio: "bpuay.mp3" },
  { en: "to throw up; vomit", th: "อ้วก", rom: "ûak", cat: "Verbs", lesson: 16, audio: "uak.mp3" },
  { en: "to have diarrhea", th: "ท้องเสีย", rom: "tóng-sĭa", cat: "Verbs", lesson: 16, audio: "tong-sia.mp3" },
  { en: "to feel nauseous", th: "คลื่นไส้", rom: "klêun sâi", cat: "Verbs", lesson: 16, audio: "kleun-sai.mp3" },
  { en: "food poisoning", th: "อาหารเป็นพิษ", rom: "aa-hăan bpen pít", cat: "Nouns", lesson: 16, audio: "aa-haan-bpen-pit.mp3" },
  { en: "to be dizzy", th: "เวียนหัว", rom: "wian hŭa", cat: "Verbs", lesson: 16, audio: "wian-hua.mp3" },
  { en: "to have a headache", th: "ปวดหัว", rom: "bpùat hŭa", cat: "Verbs", lesson: 16, audio: "bpuat-hua.mp3" },
  { en: "to have a stomach ache", th: "ปวดท้อง", rom: "bpùat tóng", cat: "Verbs", lesson: 16, audio: "bpuat-tong.mp3" },
  { en: "to have a soar throat", th: "เจ็บคอ", rom: "jèp kor", cat: "Verbs", lesson: 16, audio: "jep-kor.mp3" },
  { en: "to cough", th: "ไอ", rom: "ai", cat: "Verbs", lesson: 16, audio: "ai.mp3" },
  { en: "to have a fever", th: "เป็นไข้", rom: "bpen kâi", cat: "Verbs", lesson: 16, audio: "bpen-kai.mp3" },
  { en: "to have a cold; flu", th: "เป็นหวัด", rom: "bpen wàt", cat: "Verbs", lesson: 16, audio: "bpen-wat.mp3" },
  { en: "runny nose", th: "น้ำมูกไหล", rom: "náam môok lăi", cat: "Verbs", lesson: 16 },
  { en: "to be sleepy", th: "ง่วง", rom: "ngûang", cat: "Verbs", lesson: 16, audio: "nguang.mp3" },
  { en: "to sleep", th: "นอน / นอนหลับ", rom: "non (làp)", cat: "Verbs", lesson: 16, audio: "non.mp3" },
  { en: "to pay", th: "จ่าย", rom: "jàai", cat: "Verbs", lesson: 16, audio: "jaai.mp3" },
  { en: "yet; still", th: "ยัง", rom: "yang", cat: "Function", lesson: 16, audio: "yang.mp3" },
  { en: "that (conjunction)", th: "ว่า", rom: "wâa", cat: "Conjunction", lesson: 9, audio: "waa.mp3" },
  { en: "dessert; sweets", th: "ของหวาน", rom: "kŏng wăan", cat: "Nouns", lesson: 16 },
  { en: "sport", th: "กีฬา", rom: "gee-laa", cat: "Nouns", lesson: 16, audio: "geela.mp3" },
  { en: "to finish", th: "เสร็จ", rom: "sèt", cat: "Verbs", lesson: 16, audio: "set.mp3" },
  { en: "to finish; stop; quit", th: "เลิก", rom: "lêrk", cat: "Verbs", lesson: 16, audio: "lerk.mp3" },
  { en: "to finish work", th: "เลิกงาน", rom: "lêrk ngaan", cat: "Phrases", lesson: 16, audio: "lerk-ngaan.mp3" },
  { en: "to take a picture", th: "ถ่ายรูป", rom: "tàai rôop", cat: "Verbs", lesson: 16, audio: "taai-roop.mp3" },
  { en: "to forget", th: "ลืม", rom: "leum", cat: "Verbs", lesson: 11, audio: "leum.mp3" },
  { en: "fat; overweight", th: "อ้วน", rom: "ûan", cat: "Adjectives", lesson: 16, audio: "uan.mp3" },
  { en: "thin; skinny", th: "ผอม", rom: "pŏom", cat: "Adjectives", lesson: 16, audio: "poom.mp3" },
  { en: "favorite", th: "โปรด", rom: "bpròht", cat: "Adjectives", lesson: 16, audio: "bproht.mp3" },
  { en: "to envy; be jealous", th: "อิจฉา", rom: "ìt-chăa", cat: "Verbs", lesson: 16, audio: "it-chaa.mp3" },
  { en: "to do homework", th: "ทำการบ้าน", rom: "tam gaan bâan", cat: "Verbs", lesson: 16 },
  { en: "to have ever; used to", th: "เคย", rom: "koie", cat: "Function", lesson: 16, audio: "koie.mp3" },
  { en: "never", th: "ไม่เคย", rom: "mâi koie", cat: "Function", lesson: 16, audio: "mai-koie.mp3" },
  { en: "When?", th: "เมื่อไหร่", rom: "mêua-rài", cat: "Function", lesson: 16, audio: "meua-rai.mp3" },
  { en: "in that case", th: "งั้น", rom: "ngán", cat: "Conjunction", lesson: 16, audio: "ngan.mp3" },
  { en: "to smoke", th: "สูบบุหรี่", rom: "sòop bù-rèe", cat: "Verbs", lesson: 16, audio: "soop-bu-ree.mp3" },
  { en: "all night", th: "ทั้งคืน", rom: "táng keun", cat: "Adverbs", lesson: 16, audio: "tang-keun.mp3" },
  { en: "all day; whole day", th: "ทั้งวัน", rom: "táng wan", cat: "Adverbs", lesson: 16, audio: "tang-wan.mp3" },
  { en: "January", th: "มกราคม", rom: "mók-gà-raa kom", cat: "Days and Months", lesson: 16, audio: "month_01.mp3" },
  { en: "February", th: "กุมภาพันธ์", rom: "gum-paa pan", cat: "Days and Months", lesson: 16, audio: "month_02.mp3" },
  { en: "March", th: "มีนาคม", rom: "mee-naa kom", cat: "Days and Months", lesson: 16, audio: "month_03.mp3" },
  { en: "April", th: "เมษายน", rom: "may-săa-yon", cat: "Days and Months", lesson: 16, audio: "month_04.mp3" },
  { en: "May", th: "พฤษภาคม", rom: "préut-sà-paa kom", cat: "Days and Months", lesson: 16, audio: "month_05.mp3" },
  { en: "June", th: "มิถุนายน", rom: "mí-tù-naa-yon", cat: "Days and Months", lesson: 16, audio: "month_06.mp3" },
  { en: "July", th: "กรกฎาคม", rom: "gà-rá-gà-daa-kom", cat: "Days and Months", lesson: 16, audio: "month_07.mp3" },
  { en: "August", th: "สิงหาคม", rom: "sĭng-hăa kom", cat: "Days and Months", lesson: 16, audio: "month_08.mp3" },
  { en: "September", th: "กันยายน", rom: "gan-yaa-yon", cat: "Days and Months", lesson: 16, audio: "month_09.mp3" },
  { en: "October", th: "ตุลาคม", rom: "dtù-laa kom", cat: "Days and Months", lesson: 16, audio: "month_10.mp3" },
  { en: "November", th: "พฤศจิกายน", rom: "préut-sà-jì-gaa-yon", cat: "Days and Months", lesson: 16, audio: "month_11.mp3" },
  { en: "December", th: "ธันวาคม", rom: "tan-waa kom", cat: "Days and Months", lesson: 16, audio: "month_12.mp3" },
  { en: "last night", th: "เมื่อคืน", rom: "mêua keun", cat: "Adverbs", lesson: 8, audio: "meua-keun.mp3" },
  { en: "yesterday", th: "เมื่อวาน", rom: "mêua waan", cat: "Adverbs", lesson: 8, audio: "meua-waan.mp3" },
  { en: "3 days ago", th: "สามวันที่แล้ว", rom: "săam wan têe láew", cat: "Adverbs", lesson: 16, audio: "saam-wan-tee-laew.mp3" },
  { en: "last week", th: "อาทิตย์ที่แล้ว", rom: "aa-tít têe láew", cat: "Adverbs", lesson: 16, audio: "aatit-tee-laew.mp3" },
  { en: "6 weeks ago", th: "หกอาทิตย์ที่แล้ว", rom: "hòk aa-tít têe láew", cat: "Adverbs", lesson: 16, audio: "hok-aatit-tee-laew.mp3" },
  { en: "last month", th: "เดือนที่แล้ว", rom: "deuan têe láew", cat: "Adverbs", lesson: 16, audio: "deuan-tee-laew.mp3" },
  { en: "2 months ago", th: "สองเดือนที่แล้ว", rom: "sŏng deuan têe láew", cat: "Adverbs", lesson: 16, audio: "song-deuan-tee-laew.mp3" },
  { en: "last year", th: "ปีที่แล้ว", rom: "bpee têe láew", cat: "Adverbs", lesson: 16, audio: "bpee-tee-laew.mp3" },
  { en: "5 years ago", th: "ห้าปีที่แล้ว", rom: "hâa bpee têe láew", cat: "Adverbs", lesson: 16, audio: "haa-bpee-tee-laew.mp3" },
  { en: "last Friday", th: "วันศุกร์ที่แล้ว", rom: "wan sùk têe láew", cat: "Adverbs", lesson: 16, audio: "wan-suk-tee-laew.mp3" },
  { en: "last Sunday", th: "วันอาทิตย์ที่แล้ว", rom: "wan aa-tít têe-láew", cat: "Adverbs", lesson: 16, audio: "wan-aatit-tee-laew.mp3" },
  { en: "this morning (past)", th: "เมื่อเช้านี้", rom: "mêua cháo née", cat: "Adverbs", lesson: 16, audio: "meua-chao-nee.mp3" },
  { en: "first time", th: "ครั้งแรก", rom: "kráng râek", cat: "Adverbs", lesson: 16, audio: "krang-raek.mp3" },
  { en: "more than", th: "มากกว่า", rom: "mâak gwàa", cat: "Adverbs", lesson: 16, audio: "maak-gwaa.mp3" },
  { en: "almost", th: "เกือบ", rom: "gèuap", cat: "Adverbs", lesson: 16, audio: "geuap.mp3" },
  { en: "present continuous marker (...ing)", th: "กำลัง", rom: "gam-lang", cat: "Function", lesson: 16, audio: "gam-lang.mp3" },
  { en: "busy", th: "ยุ่ง", rom: "yûng", cat: "Adjectives", lesson: 16, audio: "yung.mp3" },
  { en: "free; available", th: "ว่าง", rom: "wâang", cat: "Adjectives", lesson: 15, audio: "waang.mp3" },
  { en: "to take a shower", th: "อาบน้ำ", rom: "àap náam", cat: "Verbs", lesson: 16, audio: "aap-naam.mp3" },
  { en: "to wait", th: "รอ", rom: "ror", cat: "Verbs", lesson: 6, audio: "ror.mp3" },
  // ===== EXTRA PACK (beyond the Beginner Course) =====
  // --- Colors ---
  { en: "color", th: "สี", rom: "sĕe", cat: "Colors - Level 1", pack: "extra" },
  { en: "red", th: "แดง", rom: "daeng", cat: "Colors - Level 1", pack: "extra" },
  { en: "blue", th: "น้ำเงิน", rom: "náam ngern", cat: "Colors - Level 1", pack: "extra" },
  { en: "green", th: "เขียว", rom: "kĭeow", cat: "Colors - Level 1", pack: "extra" },
  { en: "yellow", th: "เหลือง", rom: "lĕuang", cat: "Colors - Level 1", pack: "extra" },
  { en: "orange", th: "ส้ม", rom: "sôm", cat: "Colors - Level 1", pack: "extra" },
  { en: "purple", th: "ม่วง", rom: "mûang", cat: "Colors - Level 1", pack: "extra" },
  { en: "pink", th: "ชมพู", rom: "chom-poo", cat: "Colors - Level 1", pack: "extra", audio: "chom-poo.mp3" },
  { en: "brown", th: "น้ำตาล", rom: "nám dtaan", cat: "Colors - Level 1", pack: "extra" },
  { en: "black", th: "ดำ", rom: "dam", cat: "Colors - Level 1", pack: "extra" },
  { en: "white", th: "ขาว", rom: "kăao", cat: "Colors - Level 1", pack: "extra" },
  { en: "gray", th: "เทา", rom: "tao", cat: "Colors - Level 1", pack: "extra", audio: "tao.mp3" },
  { en: "gold", th: "ทอง", rom: "tong", cat: "Colors - Level 2", pack: "extra" },
  { en: "silver", th: "เงิน", rom: "ngern", cat: "Colors - Level 2", pack: "extra" },
  { en: "light blue", th: "สีฟ้า", rom: "sĕe fáa", cat: "Colors - Level 2", pack: "extra" },
  { en: "navy blue", th: "กรมท่า", rom: "grom-má-tâa", cat: "Colors - Level 2", pack: "extra" },
  { en: "cream", th: "ครีม", rom: "kreem", cat: "Colors - Level 2", pack: "extra" },
  { en: "dark", th: "เข้ม", rom: "kêm", cat: "Colors - Level 2", pack: "extra" },
  { en: "light", th: "อ่อน", rom: "òn", cat: "Colors - Level 2", pack: "extra" },
  { en: "dark blue", th: "น้ำเงินเข้ม", rom: "náam ngern kêm", cat: "Colors - Level 2", pack: "extra" },
  { en: "dark green", th: "เขียวเข้ม", rom: "kĭeow kêm", cat: "Colors - Level 2", pack: "extra" },
  { en: "dark brown", th: "น้ำตาลเข้ม", rom: "nám dtaan kêm", cat: "Colors - Level 2", pack: "extra" },
  { en: "light green", th: "เขียวอ่อน", rom: "kĭeow òn", cat: "Colors - Level 2", pack: "extra" },
  // --- Sports & Hobbies ---
  { en: "sport", th: "กีฬา", rom: "gee-laa", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "hobby", th: "งานอดิเรก", rom: "ngaan à-dì-rèk", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "free time", th: "เวลาว่าง", rom: "way-laa wâang", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "football; soccer", th: "ฟุตบอล", rom: "fút bon", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "swimming", th: "ว่ายน้ำ", rom: "wâai náam", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "running", th: "วิ่ง", rom: "wîng", cat: "Sports & Hobbies - Level 1", pack: "extra", audio: "wing.mp3" },
  { en: "reading", th: "อ่านหนังสือ", rom: "àan năng-sĕu", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "cooking", th: "ทำอาหาร", rom: "tam aa-hăan", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "listening to music", th: "ฟังเพลง", rom: "fang pleng", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "singing", th: "ร้องเพลง", rom: "róng pleng", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "watching movies", th: "ดูหนัง", rom: "doo năng", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "watching TV", th: "ดูทีวี", rom: "doo tee wee", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "watching YouTube", th: "ดูยูทูบ", rom: "doo yoo-tôop", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "playing video games", th: "เล่นเกม", rom: "lên gem", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "traveling", th: "ท่องเที่ยว", rom: "tông tîeow", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "shopping", th: "ช้อปปิ้ง", rom: "chóp-bpîng", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "studying", th: "เรียน", rom: "rian", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "learning languages", th: "เรียนภาษา", rom: "rian paa-săa", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "walking", th: "เดินเล่น", rom: "dern lên", cat: "Sports & Hobbies - Level 1", pack: "extra", audio: "dern-len.mp3" },
  { en: "exercising", th: "ออกกำลังกาย", rom: "òk gam-lang gaai", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "relaxing", th: "พักผ่อน", rom: "pák pòn", cat: "Sports & Hobbies - Level 1", pack: "extra" },
  { en: "basketball", th: "บาสเกตบอล", rom: "bâat-gèt-bon", cat: "Sports & Hobbies - Level 2", pack: "extra" },
  { en: "cycling", th: "ปั่นจักรยาน", rom: "bpàn jàk-grà-yaan", cat: "Sports & Hobbies - Level 2", pack: "extra" },
  { en: "weight lifting", th: "ยกน้ำหนัก", rom: "yók náam nàk", cat: "Sports & Hobbies - Level 2", pack: "extra" },
  { en: "tennis", th: "เทนนิส", rom: "ten-nít", cat: "Sports & Hobbies - Level 2", pack: "extra" },
  { en: "Thai boxing", th: "มวยไทย", rom: "muay thai", cat: "Sports & Hobbies - Level 2", pack: "extra" },
  { en: "writing", th: "เขียนหนังสือ", rom: "kĭan năng-sĕu", cat: "Sports & Hobbies - Level 2", pack: "extra" },
  { en: "drawing", th: "วาดรูป", rom: "wâat rôop", cat: "Sports & Hobbies - Level 2", pack: "extra" },
  { en: "painting", th: "วาดภาพ", rom: "wâat pâap", cat: "Sports & Hobbies - Level 2", pack: "extra" },
  { en: "photography", th: "ถ่ายรูป", rom: "tàai rôop", cat: "Sports & Hobbies - Level 2", pack: "extra" },
  { en: "gardening", th: "ทำสวน", rom: "tam sŭan", cat: "Sports & Hobbies - Level 2", pack: "extra" },
  { en: "playing guitar", th: "เล่นกีตาร์", rom: "lên gee-dtâa", cat: "Sports & Hobbies - Level 2", pack: "extra" },
  { en: "playing piano", th: "เล่นเปียโน", rom: "lên bpia-noh", cat: "Sports & Hobbies - Level 2", pack: "extra" },
  { en: "dancing", th: "เต้น", rom: "dtên", cat: "Sports & Hobbies - Level 2", pack: "extra" },
  { en: "board games", th: "บอร์ดเกม", rom: "bòt gem", cat: "Sports & Hobbies - Level 2", pack: "extra" },
  { en: "meditating", th: "นั่งสมาธิ", rom: "nâng sà-maa-tí", cat: "Sports & Hobbies - Level 2", pack: "extra" },
  { en: "yoga", th: "โยคะ", rom: "yoh-ká", cat: "Sports & Hobbies - Level 2", pack: "extra" },
  // --- Animals ---
  { en: "animal", th: "สัตว์", rom: "sàt", cat: "Animals - Level 1", pack: "extra", audio: "sat.mp3" },
  { en: "pet", th: "สัตว์เลี้ยง", rom: "sàt líang", cat: "Animals - Level 1", pack: "extra" },
  { en: "dog", th: "หมา", rom: "măa", cat: "Animals - Level 1", pack: "extra" },
  { en: "cat", th: "แมว", rom: "maew", cat: "Animals - Level 1", pack: "extra" },
  { en: "fish", th: "ปลา", rom: "bplaa", cat: "Animals - Level 1", pack: "extra" },
  { en: "bird", th: "นก", rom: "nók", cat: "Animals - Level 1", pack: "extra" },
  { en: "chicken", th: "ไก่", rom: "gài", cat: "Animals - Level 1", pack: "extra" },
  { en: "duck", th: "เป็ด", rom: "bpèt", cat: "Animals - Level 1", pack: "extra", audio: "bpet.mp3" },
  { en: "pig", th: "หมู", rom: "mŏo", cat: "Animals - Level 1", pack: "extra" },
  { en: "cow", th: "วัว", rom: "wuua", cat: "Animals - Level 1", pack: "extra", audio: "wuua.mp3" },
  { en: "horse", th: "ม้า", rom: "máa", cat: "Animals - Level 1", pack: "extra" },
  { en: "elephant", th: "ช้าง", rom: "cháng", cat: "Animals - Level 1", pack: "extra" },
  { en: "tiger", th: "เสือ", rom: "sĕua", cat: "Animals - Level 1", pack: "extra", audio: "seua.mp3" },
  { en: "lion", th: "สิงโต", rom: "sĭng-dtoh", cat: "Animals - Level 1", pack: "extra", audio: "sing-dtoh.mp3" },
  { en: "monkey", th: "ลิง", rom: "ling", cat: "Animals - Level 1", pack: "extra", audio: "ling.mp3" },
  { en: "snake", th: "งู", rom: "ngoo", cat: "Animals - Level 1", pack: "extra", audio: "ngoo.mp3" },
  { en: "mouse; rat", th: "หนู", rom: "nŏo", cat: "Animals - Level 2", pack: "extra" },
  { en: "rabbit", th: "กระต่าย", rom: "grà-dtàai", cat: "Animals - Level 2", pack: "extra" },
  { en: "goat", th: "แพะ", rom: "páe", cat: "Animals - Level 2", pack: "extra" },
  { en: "buffalo", th: "ควาย", rom: "kwaai", cat: "Animals - Level 2", pack: "extra" },
  { en: "bear", th: "หมี", rom: "mĕe", cat: "Animals - Level 2", pack: "extra" },
  { en: "deer", th: "กวาง", rom: "gwaang", cat: "Animals - Level 2", pack: "extra" },
  { en: "fox", th: "สุนัขจิ้งจอก", rom: "sù-nák jîng-jòk", cat: "Animals - Level 2", pack: "extra" },
  { en: "crocodile", th: "จระเข้", rom: "jor-rá-kây", cat: "Animals - Level 2", pack: "extra" },
  { en: "gecko", th: "ตุ๊กแก", rom: "dtúk-gae", cat: "Animals - Level 2", pack: "extra" },
  { en: "turtle", th: "เต่า", rom: "dtào", cat: "Animals - Level 2", pack: "extra", audio: "dtao.mp3" },
  { en: "frog", th: "กบ", rom: "gòp", cat: "Animals - Level 2", pack: "extra" },
  { en: "mosquito", th: "ยุง", rom: "yung", cat: "Animals - Level 2", pack: "extra" },
  { en: "ant", th: "มด", rom: "mót", cat: "Animals - Level 2", pack: "extra" },
  { en: "fly", th: "แมลงวัน", rom: "má-laeng wan", cat: "Animals - Level 2", pack: "extra" },
  { en: "bee", th: "ผึ้ง", rom: "pêung", cat: "Animals - Level 2", pack: "extra" },
  { en: "butterfly", th: "ผีเสื้อ", rom: "pĕe sêua", cat: "Animals - Level 2", pack: "extra" },
  // --- Emotions+ ---
  { en: "happy", th: "มีความสุข", rom: "mee kwaam sùk", cat: "Emotions - Level 1", pack: "extra" },
  { en: "glad; pleased", th: "ดีใจ", rom: "dee jai", cat: "Emotions - Level 1", pack: "extra" },
  { en: "sad", th: "เศร้า", rom: "sâo", cat: "Emotions - Level 1", pack: "extra" },
  { en: "excited", th: "ตื่นเต้น", rom: "dtèun dtên", cat: "Emotions - Level 1", pack: "extra" },
  { en: "tired", th: "เหนื่อย", rom: "nèuay", cat: "Emotions - Level 1", pack: "extra" },
  { en: "sleepy", th: "ง่วง", rom: "ngûang", cat: "Emotions - Level 1", pack: "extra" },
  { en: "angry", th: "โกรธ", rom: "gròht", cat: "Emotions - Level 1", pack: "extra" },
  { en: "scared", th: "กลัว", rom: "glua", cat: "Emotions - Level 1", pack: "extra" },
  { en: "worried; anxious", th: "กังวล", rom: "gang-won", cat: "Emotions - Level 1", pack: "extra" },
  { en: "bored", th: "เบื่อ", rom: "bèua", cat: "Emotions - Level 1", pack: "extra" },
  { en: "lonely", th: "เหงา", rom: "ngăo", cat: "Emotions - Level 1", pack: "extra" },
  { en: "disappointed", th: "ผิดหวัง", rom: "pìt wăng", cat: "Emotions - Level 1", pack: "extra" },
  { en: "to be fine", th: "สบายดี", rom: "sà-baai dee", cat: "Emotions - Level 1", pack: "extra" },
  { en: "to smile", th: "ยิ้ม", rom: "yím", cat: "Emotions - Level 1", pack: "extra", audio: "yim.mp3" },
  { en: "to laugh", th: "หัวเราะ", rom: "hŭa rór", cat: "Emotions - Level 1", pack: "extra", audio: "hua-ror.mp3" },
  { en: "to cry", th: "ร้องไห้", rom: "róng hâi", cat: "Emotions - Level 1", pack: "extra" },
  { en: "to feel", th: "รู้สึก", rom: "róo sèuk", cat: "Emotions - Level 1", pack: "extra" },
  { en: "to feel terrible", th: "รู้สึกแย่", rom: "róo sèuk yâe", cat: "Emotions - Level 1", pack: "extra", audio: "roo-seuk-yae.mp3" },
  { en: "exciting", th: "น่าตื่นเต้น", rom: "nâa dtèun dtên", cat: "Emotions - Level 1", pack: "extra", audio: "naa-dteun-dten.mp3" },
  { en: "scary", th: "น่ากลัว", rom: "nâa glua", cat: "Emotions - Level 1", pack: "extra" },
  { en: "boring", th: "น่าเบื่อ", rom: "nâa bèua", cat: "Emotions - Level 1", pack: "extra" },
  { en: "hate", th: "เกลียด", rom: "glìat", cat: "Emotions - Level 2", pack: "extra", audio: "gliat.mp3" },
  { en: "proud", th: "ภูมิใจ", rom: "poom jai", cat: "Emotions - Level 2", pack: "extra" },
  { en: "upset; hurt; heartbroken", th: "เสียใจ", rom: "sĭa jai", cat: "Emotions - Level 2", pack: "extra" },
  { en: "stressed", th: "เครียด", rom: "krîat", cat: "Emotions - Level 2", pack: "extra" },
  { en: "shocked; surprised", th: "ตกใจ", rom: "dtòk jai", cat: "Emotions - Level 2", pack: "extra" },
  { en: "jealous", th: "หึง", rom: "hĕung", cat: "Emotions - Level 2", pack: "extra" },
  { en: "envious", th: "อิจฉา", rom: "ìt-chăa", cat: "Emotions - Level 2", pack: "extra" },
  { en: "guilty", th: "รู้สึกผิด", rom: "róo sèuk pìt", cat: "Emotions - Level 2", pack: "extra", audio: "roo-seuk-pit.mp3" },
  { en: "shy", th: "อาย", rom: "aai", cat: "Emotions - Level 2", pack: "extra" },
  { en: "confident", th: "มั่นใจ", rom: "mân jai", cat: "Emotions - Level 2", pack: "extra" },
  { en: "hopeful", th: "มีความหวัง", rom: "mee kwaam wăng", cat: "Emotions - Level 2", pack: "extra" },
  { en: "relaxed", th: "ผ่อนคลาย", rom: "pòn klaai", cat: "Emotions - Level 2", pack: "extra" },
  { en: "satisfied", th: "พอใจ", rom: "por jai", cat: "Emotions - Level 2", pack: "extra" },
  { en: "weak; exhausted", th: "อ่อนเพลีย", rom: "òn plia", cat: "Emotions - Level 2", pack: "extra" },
  { en: "energetic", th: "กระปรี้กระเปร่า", rom: "grà-bprêe-grà-bprào", cat: "Emotions - Level 2", pack: "extra" },
  // --- Body ---
  { en: "body", th: "ร่างกาย", rom: "râang gaai", cat: "Body", pack: "extra" },
  { en: "head", th: "หัว", rom: "hŭa", cat: "Body", pack: "extra" },
  { en: "hair", th: "ผม", rom: "pŏm", cat: "Body", pack: "extra" },
  { en: "face", th: "หน้า", rom: "nâa", cat: "Body", pack: "extra" },
  { en: "eye", th: "ตา", rom: "dtaa", cat: "Body", pack: "extra" },
  { en: "ear", th: "หู", rom: "hŏo", cat: "Body", pack: "extra" },
  { en: "nose", th: "จมูก", rom: "jà-mòok", cat: "Body", pack: "extra" },
  { en: "mouth", th: "ปาก", rom: "bpàak", cat: "Body", pack: "extra" },
  { en: "tooth", th: "ฟัน", rom: "fan", cat: "Body", pack: "extra" },
  { en: "neck", th: "คอ", rom: "kor", cat: "Body", pack: "extra" },
  { en: "shoulder", th: "ไหล่", rom: "lài", cat: "Body", pack: "extra" },
  { en: "arm", th: "แขน", rom: "kăen", cat: "Body", pack: "extra" },
  { en: "hand", th: "มือ", rom: "meu", cat: "Body", pack: "extra" },
  { en: "stomach", th: "ท้อง", rom: "tóng", cat: "Body", pack: "extra" },
  { en: "back", th: "หลัง", rom: "lăng", cat: "Body", pack: "extra" },
  { en: "leg", th: "ขา", rom: "kăa", cat: "Body", pack: "extra" },
  { en: "foot", th: "เท้า", rom: "táo", cat: "Body", pack: "extra" },
  { en: "knee", th: "เข่า", rom: "kào", cat: "Body", pack: "extra" },
  // --- Health & Symptoms ---
  { en: "to hurt; be painful", th: "เจ็บ", rom: "jèp", cat: "Health & Symptoms", pack: "extra", audio: "jep.mp3" },
  { en: "blood", th: "เลือด", rom: "lêuat", cat: "Health & Symptoms", pack: "extra" },
  { en: "bleeding", th: "เลือดออก", rom: "lêuat òk", cat: "Health & Symptoms", pack: "extra" },
  { en: "headache", th: "ปวดหัว", rom: "bpùat hŭa", cat: "Health & Symptoms", pack: "extra" },
  { en: "stomach ache", th: "ปวดท้อง", rom: "bpùat tóng", cat: "Health & Symptoms", pack: "extra" },
  { en: "back pain", th: "ปวดหลัง", rom: "bpùat lăng", cat: "Health & Symptoms", pack: "extra" },
  { en: "knee pain", th: "ปวดเข่า", rom: "bpùat kào", cat: "Health & Symptoms", pack: "extra" },
  { en: "broken (bone)", th: "หัก", rom: "hàk", cat: "Health & Symptoms", pack: "extra" },
  { en: "sick", th: "ป่วย", rom: "bpùay", cat: "Health & Symptoms", pack: "extra" },
  { en: "fever", th: "ไข้", rom: "kâi", cat: "Health & Symptoms", pack: "extra" },
  { en: "to have a fever", th: "เป็นไข้", rom: "bpen kâi", cat: "Health & Symptoms", pack: "extra" },
  { en: "to have a cold; flu", th: "เป็นหวัด", rom: "bpen wàt", cat: "Health & Symptoms", pack: "extra" },
  { en: "dizzy", th: "เวียนหัว", rom: "wian hŭa", cat: "Health & Symptoms", pack: "extra" },
  { en: "nauseous", th: "คลื่นไส้", rom: "klêun sâi", cat: "Health & Symptoms", pack: "extra" },
  { en: "cough", th: "ไอ", rom: "ai", cat: "Health & Symptoms", pack: "extra" },
  { en: "runny nose", th: "น้ำมูกไหล", rom: "náam môok lăi", cat: "Health & Symptoms", pack: "extra" },
  { en: "to throw up; vomit", th: "อ้วก", rom: "ûak", cat: "Health & Symptoms", pack: "extra" },
  { en: "sore throat", th: "เจ็บคอ", rom: "jèp kor", cat: "Health & Symptoms", pack: "extra" },
  { en: "diarrhea", th: "ท้องเสีย", rom: "tóng-sĭa", cat: "Health & Symptoms", pack: "extra" },
  { en: "allergy", th: "แพ้", rom: "páe", cat: "Health & Symptoms", pack: "extra" },
  { en: "medicine", th: "ยา", rom: "yaa", cat: "Health & Symptoms", pack: "extra" },
  { en: "pharmacy", th: "ร้านขายยา", rom: "ráan kăai yaa", cat: "Health & Symptoms", pack: "extra" },
  { en: "hospital", th: "โรงพยาบาล", rom: "rohng pá-yaa-baan", cat: "Health & Symptoms", pack: "extra" },
  { en: "ambulance", th: "รถพยาบาล", rom: "rót pá-yaa-baan", cat: "Health & Symptoms", pack: "extra" },
  { en: "emergency", th: "ฉุกเฉิน", rom: "chùk-chĕrn", cat: "Health & Symptoms", pack: "extra" },
  { en: "doctor", th: "หมอ", rom: "mŏr", cat: "Health & Symptoms", pack: "extra" },
  { en: "nurse", th: "พยาบาล", rom: "pá-yaa-baan", cat: "Health & Symptoms", pack: "extra" },
  // --- Daily Activities ---
  { en: "to sleep", th: "นอน", rom: "non", cat: "Daily Activities", pack: "extra", audio: "non.mp3" },
  { en: "to wake up", th: "ตื่น", rom: "dtèun", cat: "Daily Activities", pack: "extra" },
  { en: "to shower; bathe", th: "อาบน้ำ", rom: "àap náam", cat: "Daily Activities", pack: "extra" },
  { en: "to brush the teeth", th: "แปรงฟัน", rom: "bpraeng fan", cat: "Daily Activities", pack: "extra" },
  { en: "to get dressed", th: "แต่งตัว", rom: "dtàeng dtua", cat: "Daily Activities", pack: "extra" },
  { en: "to eat a meal", th: "กินข้าว", rom: "gin kâao", cat: "Daily Activities", pack: "extra" },
  { en: "to drink water", th: "ดื่มน้ำ", rom: "dèum náam", cat: "Daily Activities", pack: "extra" },
  { en: "to cook", th: "ทำอาหาร", rom: "tam aa-hăan", cat: "Daily Activities", pack: "extra" },
  { en: "to work", th: "ทำงาน", rom: "tam ngaan", cat: "Daily Activities", pack: "extra" },
  { en: "to study", th: "เรียน", rom: "rian", cat: "Daily Activities", pack: "extra" },
  { en: "to go home", th: "กลับบ้าน", rom: "glàp bâan", cat: "Daily Activities", pack: "extra" },
  { en: "to wash dishes", th: "ล้างจาน", rom: "láang jaan", cat: "Daily Activities", pack: "extra" },
  { en: "to do laundry", th: "ซักผ้า", rom: "sák pâa", cat: "Daily Activities", pack: "extra" },
  { en: "to clean", th: "ทำความสะอาด", rom: "tam kwaam sà-àat", cat: "Daily Activities", pack: "extra" },
  { en: "to do housework", th: "ทำงานบ้าน", rom: "tam ngaan bâan", cat: "Daily Activities", pack: "extra" },
  { en: "to do homework", th: "ทำการบ้าน", rom: "tam gaan bâan", cat: "Daily Activities", pack: "extra" },
  { en: "to shop; buy things", th: "ซื้อของ", rom: "séu kŏng", cat: "Daily Activities", pack: "extra", audio: "seu-kong.mp3" },
  { en: "to walk", th: "เดิน", rom: "dern", cat: "Daily Activities", pack: "extra", audio: "dern.mp3" },
  { en: "to run", th: "วิ่ง", rom: "wîng", cat: "Daily Activities", pack: "extra" },
  { en: "to exercise", th: "ออกกำลังกาย", rom: "òk gam-lang gaai", cat: "Daily Activities", pack: "extra" },
  { en: "to rest", th: "พักผ่อน", rom: "pák pòn", cat: "Daily Activities", pack: "extra" },
  // --- Countries & Languages ---
  { en: "country", th: "ประเทศ", rom: "bprà-têt", cat: "Countries & Languages", pack: "extra" },
  { en: "language", th: "ภาษา", rom: "paa-săa", cat: "Countries & Languages", pack: "extra" },
  { en: "person", th: "คน", rom: "kon", cat: "Countries & Languages", pack: "extra" },
  { en: "Thai", th: "ไทย", rom: "thai", cat: "Countries & Languages", pack: "extra" },
  { en: "China", th: "จีน", rom: "jeen", cat: "Countries & Languages", pack: "extra" },
  { en: "Japan", th: "ญี่ปุ่น", rom: "yêe-bpùn", cat: "Countries & Languages", pack: "extra" },
  { en: "Korea", th: "เกาหลี", rom: "gao-lĕe", cat: "Countries & Languages", pack: "extra" },
  { en: "South Korea", th: "เกาหลีใต้", rom: "gao-lĕe dtâi", cat: "Countries & Languages", pack: "extra" },
  { en: "North Korea", th: "เกาหลีเหนือ", rom: "gao-lĕe nĕuua", cat: "Countries & Languages", pack: "extra" },
  { en: "India", th: "อินเดีย", rom: "in-diia", cat: "Countries & Languages", pack: "extra" },
  { en: "Vietnam", th: "เวียดนาม", rom: "wîat-naam", cat: "Countries & Languages", pack: "extra" },
  { en: "Singapore", th: "สิงคโปร์", rom: "sĭng-ká-bpoh", cat: "Countries & Languages", pack: "extra" },
  { en: "Malaysia", th: "มาเลเซีย", rom: "maa-lay-siia", cat: "Countries & Languages", pack: "extra" },
  { en: "Indonesia", th: "อินโดนีเซีย", rom: "in-doh-nee-siia", cat: "Countries & Languages", pack: "extra" },
  { en: "England; Britain", th: "อังกฤษ", rom: "ang-grìt", cat: "Countries & Languages", pack: "extra" },
  { en: "France", th: "ฝรั่งเศส", rom: "fà-ràng-sèt", cat: "Countries & Languages", pack: "extra" },
  { en: "Germany", th: "เยอรมนี", rom: "yer-rá-má-nee", cat: "Countries & Languages", pack: "extra" },
  { en: "Italy", th: "อิตาลี", rom: "ì-dtaa-lee", cat: "Countries & Languages", pack: "extra" },
  { en: "Spain", th: "สเปน", rom: "sà-bpen", cat: "Countries & Languages", pack: "extra" },
  { en: "Russia", th: "รัสเซีย", rom: "rát-siia", cat: "Countries & Languages", pack: "extra" },
  { en: "Netherlands", th: "เนเธอร์แลนด์", rom: "nay-ter-laen", cat: "Countries & Languages", pack: "extra" },
  { en: "Switzerland", th: "สวิตเซอร์แลนด์", rom: "sà-wìt-sêr-laen", cat: "Countries & Languages", pack: "extra" },
  { en: "America", th: "อเมริกา", rom: "à-may-rí-gaa", cat: "Countries & Languages", pack: "extra" },
  { en: "Canada", th: "แคนาดา", rom: "kae-naa-daa", cat: "Countries & Languages", pack: "extra" },
  { en: "Mexico", th: "เม็กซิโก", rom: "mék-sí-goh", cat: "Countries & Languages", pack: "extra" },
  { en: "Australia", th: "ออสเตรเลีย", rom: "òt-dtray-liia", cat: "Countries & Languages", pack: "extra" },
  { en: "New Zealand", th: "นิวซีแลนด์", rom: "niw-see-laen", cat: "Countries & Languages", pack: "extra" },
  { en: "Brazil", th: "บราซิล", rom: "braa-sin", cat: "Countries & Languages", pack: "extra" },
  { en: "Argentina", th: "อาร์เจนตินา", rom: "aa-jen-dtì-naa", cat: "Countries & Languages", pack: "extra" },
  { en: "South Africa", th: "แอฟริกาใต้", rom: "àef-rí-gaa dtâi", cat: "Countries & Languages", pack: "extra" },
  { en: "Saudi Arabia", th: "ซาอุดีอาระเบีย", rom: "saa-ù-dee-aa-rá-biia", cat: "Countries & Languages", pack: "extra" },
  { en: "Egypt", th: "อียิปต์", rom: "ee-yíp", cat: "Countries & Languages", pack: "extra" },
  { en: "Turkey", th: "ตุรกี", rom: "dtù-rá-gee", cat: "Countries & Languages", pack: "extra" },
  // --- Common Foods ---
  { en: "rice; meal", th: "ข้าว", rom: "kâao", cat: "Common Foods", pack: "extra" },
  { en: "noodles", th: "ก๋วยเตี๋ยว", rom: "kŭay-dtĭeow", cat: "Common Foods", pack: "extra" },
  { en: "bread", th: "ขนมปัง", rom: "kà-nŏm bpang", cat: "Common Foods", pack: "extra" },
  { en: "egg", th: "ไข่", rom: "kài", cat: "Common Foods", pack: "extra" },
  { en: "fried egg", th: "ไข่ดาว", rom: "kài daao", cat: "Common Foods", pack: "extra" },
  { en: "scrambled egg", th: "ไข่คน", rom: "kài kon", cat: "Common Foods", pack: "extra" },
  { en: "omelet", th: "ไข่เจียว", rom: "kài jieow", cat: "Common Foods", pack: "extra" },
  { en: "potato", th: "มันฝรั่ง", rom: "man fà-ràng", cat: "Common Foods", pack: "extra" },
  { en: "French fries", th: "เฟรนช์ฟรายส์", rom: "fren-fraai", cat: "Common Foods", pack: "extra" },
  { en: "chicken", th: "ไก่", rom: "gài", cat: "Common Foods", pack: "extra" },
  { en: "pork", th: "หมู", rom: "mŏo", cat: "Common Foods", pack: "extra" },
  { en: "beef", th: "เนื้อ", rom: "néua", cat: "Common Foods", pack: "extra" },
  { en: "fish", th: "ปลา", rom: "bplaa", cat: "Common Foods", pack: "extra" },
  { en: "shrimp", th: "กุ้ง", rom: "gûng", cat: "Common Foods", pack: "extra" },
  { en: "tofu", th: "เต้าหู้", rom: "dtâo-hôo", cat: "Common Foods", pack: "extra", audio: "dtao-hoo.mp3" },
  { en: "vegetables", th: "ผัก", rom: "pàk", cat: "Common Foods", pack: "extra" },
  { en: "tomato", th: "มะเขือเทศ", rom: "má-kĕua têt", cat: "Common Foods", pack: "extra" },
  { en: "onion", th: "หอมใหญ่", rom: "hŏm yài", cat: "Common Foods", pack: "extra", audio: "hom-yai.mp3" },
  { en: "garlic", th: "กระเทียม", rom: "grà-tiam", cat: "Common Foods", pack: "extra" },
  { en: "cucumber", th: "แตงกวา", rom: "dtaeng-gwaa", cat: "Common Foods", pack: "extra", audio: "dtaeng-waa.mp3" },
  { en: "carrot", th: "แครอท", rom: "kae-rôt", cat: "Common Foods", pack: "extra" },
  { en: "mushroom", th: "เห็ด", rom: "hèt", cat: "Common Foods", pack: "extra", audio: "het.mp3" },
  { en: "chili", th: "พริก", rom: "prík", cat: "Common Foods", pack: "extra" },
  { en: "fruit", th: "ผลไม้", rom: "pŏn-lá-mái", cat: "Common Foods", pack: "extra" },
  { en: "banana", th: "กล้วย", rom: "glûay", cat: "Common Foods", pack: "extra" },
  { en: "mango", th: "มะม่วง", rom: "má-mûang", cat: "Common Foods", pack: "extra" },
  { en: "orange", th: "ส้ม", rom: "sôm", cat: "Common Foods", pack: "extra" },
  { en: "watermelon", th: "แตงโม", rom: "dtaeng moh", cat: "Common Foods", pack: "extra" },
  { en: "apple", th: "แอปเปิล", rom: "àep-bpêun", cat: "Common Foods", pack: "extra" },
  { en: "pineapple", th: "สับปะรด", rom: "sàp-bpà-rót", cat: "Common Foods", pack: "extra" },
  { en: "grape", th: "องุ่น", rom: "à-ngùn", cat: "Common Foods", pack: "extra", audio: "a-ngun.mp3" },
  { en: "guava", th: "ฝรั่ง", rom: "fà-ràng", cat: "Common Foods", pack: "extra" },
  { en: "water", th: "น้ำ", rom: "náam", cat: "Common Foods", pack: "extra" },
  { en: "coffee", th: "กาแฟ", rom: "gaa-fae", cat: "Common Foods", pack: "extra" },
  { en: "green tea", th: "ชาเขียว", rom: "chaa kĭeow", cat: "Common Foods", pack: "extra" },
  { en: "black tea", th: "ชาดำ", rom: "chaa dam", cat: "Common Foods", pack: "extra", audio: "chaa-dam.mp3" },
  { en: "milk", th: "นม", rom: "nom", cat: "Common Foods", pack: "extra" },
  { en: "fruit juice", th: "น้ำผลไม้", rom: "náam pŏn-lá-mái", cat: "Common Foods", pack: "extra", audio: "naam-pon-la-mai.mp3" },
  { en: "beer", th: "เบียร์", rom: "bia", cat: "Common Foods", pack: "extra" },
  { en: "red wine", th: "ไวน์แดง", rom: "wai daeng", cat: "Common Foods", pack: "extra" },
  { en: "white wine", th: "ไวน์ขาว", rom: "wai kăao", cat: "Common Foods", pack: "extra", audio: "wai-kaao.mp3" },
  { en: "dessert; sweets", th: "ของหวาน", rom: "kŏng wăan", cat: "Common Foods", pack: "extra" },
  { en: "sugar", th: "น้ำตาล", rom: "nám dtaan", cat: "Common Foods", pack: "extra" },
  { en: "salt", th: "เกลือ", rom: "gleua", cat: "Common Foods", pack: "extra" },
  { en: "pepper", th: "พริกไทย", rom: "prík-tai", cat: "Common Foods", pack: "extra" },
];


/* ========= PHRASE RECORDINGS (not vocabulary) =========
   Thai text that has a recording but is NOT a vocabulary word.

   WHAT THIS IS FOR. The app plays a recording instead of speech synthesis
   wherever it recognises the Thai text being spoken — including one-off Thai
   written by hand into the Grammar guide, the How to Play pages, or any other
   menu, not just words from the VOCAB table above. Until now only VOCAB could
   carry an `audio` field, so a hand-written phrase had no way to name one.
   This list closes that gap: put the Thai text and the filename here and the
   phrase is spoken by a real voice everywhere it appears.

   Only two fields, because nothing else is needed — these are not words in the
   course. They have no English, no romanisation, no lesson and no category;
   they never appear in the Vocabulary list, never enter a game's word pool,
   and never count towards anything. They are purely "when this Thai text is
   spoken, play this file instead".

      { th: 'วันนี้หยุดหรอ', audio: 'wan-nee-yut-ror.mp3' }

   The file lives in ./audio/voice/ alongside the lesson recordings — just the
   filename here, no path. It is picked up by the offline warm-up automatically,
   so it is cached for offline use like any other recording, and
   checkVoiceAudio() in the browser console verifies it is actually reachable.

   IF A PHRASE HERE MATCHES A VOCAB WORD, THE VOCAB RECORDING WINS. A word in
   the course has one canonical pronunciation and that stays authoritative, so
   adding an entry here can only ever fill a gap — it can never take over, or
   silence, a word that already works. checkVoiceAudio() reports any entry that
   was shadowed this way so a well-meant duplicate is visible rather than
   mysterious.

   Two entries HERE naming different files for the same Thai text is a genuine
   contradiction with no right answer, so that text falls back to speech
   synthesis and is reported — the same rule VOCAB already follows.

   As with VOCAB, nothing can break by adding to this list: a filename that is
   missing, corrupt or too slow to start falls back to speech synthesis, so the
   phrase is always spoken one way or the other. Use plain ASCII filenames. */
const PHRASE_AUDIO = [
  { th: 'นะ', audio: 'na.mp3' },
  { th: 'คะ', audio: 'ka-question.mp3' },
  { th: 'ค่ะ', audio: 'ka-statement.mp3' },
  { th: 'คำศัพท์', audio: 'kam-sap.mp3' },
  { th: 'ไวยากรณ์', audio: 'wai-yaa-gon.mp3' },
  { th: 'เกมจับคู่', audio: 'gem-jap-koo.mp3' },
  { th: 'ฝึกฟัง', audio: 'feuk-fang.mp3' },
  { th: 'ฝึกคำศัพท์', audio: 'feuk-kam-sap.mp3' },
  { th: 'ฝึกไวยากรณ์', audio: 'feuk-wai-yaa-gon.mp3' },
  { th: 'ฝึกวรรณยุกต์', audio: 'feuk-wan-na-yuk.mp3' },
  { th: 'พจนานุกรม', audio: 'pot-ja-naa-nu-grom.mp3' },
  { th: 'ความคืบหน้า', audio: 'kwaam-keup-naa.mp3' },
  { th: 'คู่มือ', audio: 'koo-meu.mp3' },
  { th: 'พี่', audio: 'pee.mp3' },
  { th: 'น้อง', audio: 'nong.mp3' },
  { th: 'เต่า', audio: 'gao.mp3' },
  { th: 'ถาม', audio: 'taam.mp3' },
  { th: 'เหรอ', audio: 'ror-question.mp3' },
  { th: 'หรอ', audio: 'ror-question.mp3' },
  { th: 'เป็นยังไงบ้าง', audio: 'bpen-yang-ngai-baang.mp3' },
  { th: 'เฉย ๆ', audio: 'choie-choie.mp3' },
  { th: 'การตั้งค่า', audio: 'gaan-dtang-kaa.mp3' },
  { th: 'ยินดีด้วย', audio: 'yin-dee-duay.mp3' },
  { th: 'เรียบร้อยแล้ว', audio: 'riap-roi-laew.mp3' },
  { th: 'ผ่านแล้ว', audio: 'paan-laew.mp3' },
  { th: 'ยังไม่ผ่าน', audio: 'yang-mai-paan.mp3' },
  { th: 'ใช่เลย', audio: 'chai-loie.mp3' },
  { th: 'เยี่ยมมาก', audio: 'yiam-maak.mp3' },
  { th: 'ฉลาดมาก', audio: 'chalat-maak.mp3' },
  { th: 'ทำได้ดีมาก', audio: 'tam-daai-dee-maak.mp3' },
  { th: 'เป๊ะเลย', audio: 'bpe-loie.mp3' },
  { th: 'สู้ๆ', audio: 'soo-soo.mp3' },
  { th: 'ดีเลย', audio: 'dee-loie.mp3' },
  { th: 'ลองอีกครั้ง', audio: 'long-eek-krang.mp3' },
  { th: 'ลองใหม่', audio: 'long-mai.mp3' },
  { th: 'ยังไม่ถูกนะ', audio: 'yang-mai-dtook-na.mp3' },
  { th: 'ขนมปัง', audio: 'extra_ka-nom-bpang.mp3' },
  { th: 'ไข่', audio: 'extra_kai.mp3' },
  { th: 'มันฝรั่ง', audio: 'extra_man-fa-rang.mp3' },
  { th: 'พริก', audio: 'extra_prik.mp3' },
  { th: 'กล้วย', audio: 'extra_gluay.mp3' },
  { th: 'กระเทียม', audio: 'extra_gra-tiam.mp3' },
  { th: 'ส้ม', audio: 'extra_som.mp3' },
  { th: 'สับปะรด', audio: 'extra_sap-bpa-rot.mp3' },
  { th: 'ชาเขียว', audio: 'extra_chaa-kieow.mp3' },
  { th: 'เกลือ', audio: 'extra_gleua.mp3' },
  { th: 'น้ำตาล', audio: 'extra_naam-dtaan.mp3' },
  { th: 'ของหวาน', audio: 'extra_kong-waan.mp3' },
  { th: 'พริกไทย', audio: 'extra_prik-tai.mp3' },
  { th: 'สี', audio: 'extra_see.mp3' },
  { th: 'น้ำเงิน', audio: 'extra_naam-ngern.mp3' },
  { th: 'ขาว', audio: 'extra_kaao.mp3' },
  { th: 'ดำ', audio: 'extra_dam.mp3' },
  { th: 'เหลือง', audio: 'extra_leuang.mp3' },
  { th: 'ม่วง', audio: 'extra_muang.mp3' },
  { th: 'ร้องไห้', audio: 'extra_rong-hai.mp3' },
  { th: 'มะเขือเทศ', audio: 'extra_ma-keua-tet.mp3' },
  { th: 'แตงโม', audio: 'extra_dtaeng-moh.mp3' },
  { th: 'ผิดหวัง', audio: 'extra_pit-wang.mp3' },
  { th: 'ทำไมคุณเรียนภาษาไทย', audio: 'l9_tam-mai-kun-rian.mp3' },
  { th: 'เพราะผมชอบประเทศไทย', audio: 'l9_pror-pom-chop.mp3' },
  { th: 'คุณฉลาดและตลก', audio: 'l9_kun-chalaat-lae-dtalok.mp3' },
  { th: 'เขาสวยแต่หยาบคาย', audio: 'l9_kao-suay-dtae.mp3' },
  { th: 'คุณตลก', audio: 'l9_kun-dtalok.mp3' },
  { th: 'เขาสวย', audio: 'l9_kao-suay.mp3' },
  { th: 'สวยมาก', audio: 'l9_suay-maak.mp3' },
  { th: 'เขาใจดีมาก', audio: 'l9_kao-jai-dee-maak.mp3' },
  { th: 'แมวน่ารัก', audio: 'l9_maew-naa-raak.mp3' },
  { th: 'เอาอันนี้', audio: 'l10_ao-an-nee.mp3' },
  { th: 'ผมชอบดื่มกาแฟครับ', audio: 'gram_la_pom-chop-deum-kaa-fae.mp3' },
  { th: 'แล้วคุณล่ะครับ', audio: 'gram_la_laew-kun-la-krap.mp3' },
  { th: 'แล้วงานล่ะ', audio: 'gram_la_laew-ngaan-la.mp3' },
  { th: 'แล้วพรุ่งนี้ล่ะ', audio: 'gram_la_laew-prung-nee-la.mp3' },
  { th: 'ล่ะ', audio: 'gram_la_la.mp3' },
  { th: 'กินเยอะๆ', audio: 'gram_na_gin-yuh-yuh.mp3' },
  { th: 'อะไรนะ', audio: 'gram_na_arai-na.mp3' },
  { th: 'รอแป๊บนึง', audio: 'gram_na_ror-baep-neung.mp3' },
  { th: 'ระวังนะ', audio: 'gram_na_rawang-na.mp3' },
  { th: 'ระวังนะคะ', audio: 'gram_na_rawang-na-ka.mp3' },
  { th: 'ไปล่ะนะ', audio: 'gram_la_bpai-la-na.mp3' },
  { th: 'นอนล่ะนะ', audio: 'gram_la_non-la-na.mp3' },
  { th: 'ไม่ใช่แบบนั้น', audio: 'gram_mai-chai_mai-chai-baep-nan.mp3' },
  { th: 'คุณเป็นครูใช่ไหม', audio: 'gram_mai-chai_kun-bpen-kroo.mp3' },
  { th: 'ผมไม่ใช่หมอ', audio: 'gram_mai-chai_pom-mai-chai-mor.mp3' },
  { th: 'อันนี่ไม่ใช่ของผม', audio: 'gram_mai-chai_an-nee-mai-chai-kong-pom.mp3' },
  { th: 'โชคดีค่ะ', audio: 'gram_ja-chok-dee-ka.mp3' },
  { th: 'จ๊ะ', audio: 'gram_ja-ja.mp3' },
  { th: 'เหนื่อยอะ', audio: 'gram_a-nueai-a.mp3' },
  { th: 'เลย', audio: 'gram_loie-loie.mp3' },
  { th: 'กินเลย', audio: 'gram_loie-gin-loie.mp3' },
  { th: 'กินสิ', audio: 'gram_loie-gin-si.mp3' },
  { th: 'เขาว่ายน้ำเป็น', audio: 'gram_bpen_kao-waai-naam-bpen.mp3' },
  { th: 'ผมขับรถเป็น', audio: 'gram_bpen_pom-kap-rot-bpen.mp3' },
  { th: 'ฉันเต้นเป็น', audio: 'gram_bpen_chan-dten-bpen.mp3' },
  { th: 'พรุ่งนี้ผมจะไปตลาด', audio: 'gram_tones_prung-nee.mp3' },
  { th: 'ทำอะไรอะ', audio: 'gram_a_tam-arai.mp3' },
  { th: 'ถูกต้อง', audio: 'gram_took_took-dtong.mp3' },
  { th: 'ถูกแล้ว', audio: 'gram_took_took-laew.mp3' },
  { th: 'วันนี้หยุดหรอ', audio: 'wan-nee-yut-ror.mp3' },   // wan-née yùt rŏr — "Are you off today?"
  { th: 'จำได้ไหม',      audio: 'jam-daai-mai.mp3' }        // jam dâai măi — "Do you remember?"
];


/* ========= CHARACTER DIALOGUE LINES =========
   Slots per character:
     - choose:       shown when the character is selected in the cpu menu
     - gameStart:    short greeting shortly after a vs-CPU game starts
     - selfStreak:   CPU got a match streak (≥2 in a row)
     - playerStreak: PLAYER got a match streak (≥2 in a row)
     - selfMatch:    CPU made a regular (non-streak) match
     - playerMatch:  PLAYER made a regular (non-streak) match
     - selfMiss:     CPU made a wrong-pair guess
     - playerMiss:   PLAYER made a wrong-pair guess
     - win:          shown in the end-game modal when CPU won (player lost)
     - lose:         shown in the end-game modal when CPU lost (player won)
     - draw:         shown in the end-game modal on a tie
   Each slot is an array of variants. When firing, a random variant is picked.
   Empty arrays = no dialogue for that slot (character stays silent).
   In-game popup probabilities for each slot live in CPU_CHAT_PROB. */
const CHARACTER_LINES = {
  grandma: {
    choose: [
      { th: 'ยายพร้อมแล้วจ้ะ', rom: 'yaai próm láew jâ', en: "Grandma's ready!", audio: "grandma_yaai-prom-laew-ja.mp3" },
	  { th: 'ไม่ต้องรีบนะจ๊ะ', rom: 'mâi dtông rêep ná já', en: "No need to hurry.", audio: "grandma_mai-dtong-reep-na-ja.mp3" },
	  { th: 'หนูอายุเท่าไหร่แล้วจ๊ะ', rom: 'nŏo aa-yú tâo rài láew já', en: "How old are you, dear?", audio: "grandma_noo-aayu-tao-rai-laew-ja.mp3" }
    ],
    win: [
      { th: 'อ้อ... ยายชนะหรอจ๊ะ', rom: 'oh! yaai chá-ná rŏr já', en: 'Oh... Did Grandma win?', audio: "grandma_yaai-cha-na-ror.mp3" }
    ],
    lose: [
      { th: 'อุ๊ย ตายแล้ว', rom: 'úi dtaai láew', en: 'Oh dear!', audio: "grandma_ui-dtaai-laew.mp3" },
	  { th: 'เสียดายจัง', rom: 'sĭa daai jang', en: 'What a pity.', audio: "grandma_sia-daai-jang.mp3" },
      { th: 'บ้าเอ้ย', rom: 'bâa ôie', en: 'Damn!', audio: "grandma_baa-oie.mp3" }
    ],
    gameStart: [
      { th: 'โชคดีนะจ๊ะ', rom: 'chôhk dee ná já', en: "Good luck, dear.", audio: "grandma_chohk-dee-na-ja.mp3" },
	  { th: 'ช้า ๆ นะจ๊ะ', rom: 'cháa cháa ná já', en: "Take it slow, please.", audio: "grandma_chaa-chaa-na-ja.mp3" }
	  // Lines spoken shortly after the game starts.
      // Add { th, rom, en } entries here; if empty (or all entries are blank), no popup will appear.
    ],
    selfStreak: [
      { th: 'ความจำยายยังดีอยู่', rom: 'kwaam-jam yaai yang dee yòo', en: "Grandma's memory is still good.", audio: "grandma_kwaam-jam.mp3" }
	  // Lines spoken when THIS character gets a match streak (proud / smug reactions).
    ],
    playerStreak: [
      { th: 'เก่งจังเลยลูก', rom: 'gèng jang loie lôok', en: "You're doing great, kid.", audio: "grandma_geng-jang.mp3" },
	  { th: 'จำเก่งจริง ๆ', rom: 'jam gèng jing jing', en: "You really have a good memory.", audio: "grandma_jam-geng.mp3" },
	  { th: 'ช้า ๆ หน่อย', rom: 'cháa cháa nòi', en: "Oh, slow down.", audio: "grandma_chaa-chaa-noi.mp3" }
	  // Lines spoken when the PLAYER gets a match streak (CPU reacts).
    ],
    selfMatch: [
      // Lines spoken after THIS character makes a regular (non-streak) match.
    ],
    playerMatch: [
      // Lines spoken after the PLAYER makes a regular (non-streak) match.
    ],
    selfMiss: [
      { th: 'ไม่ใช่หรอ', rom: 'mâi châi rŏr', en: "Oh, it's not?", audio: "grandma_mai-chai-ror.mp3" },
	  { th: 'อ้าว ผิดอีกแล้ว', rom: 'pìt èek láew', en: "Oh, wrong again.", audio: "grandma_pit-eek-laew.mp3" },
	  { th: 'ยายแก่แล้วจ้ะ', rom: 'yaai gàe láew jâ', en: "Grandma's getting old.", audio: "grandma_yaai-gae-laew-ja.mp3" },
	  { th: 'โอ้... ยายจำผิด', rom: 'yaai jam pìt', en: "Oh... Grandma remembered wrong.", audio: "grandma_yaai-jam-pit.mp3" }
	  // Lines spoken after THIS character makes a wrong-pair guess.
    ],
    playerMiss: [
      { th: 'ไม่เป็นไรจ้ะ', rom: 'mâi bpen rai jâ', en: "That's okay, dear.", audio: "grandma_mai-bpen-rai-ja.mp3" },
	  { th: 'อ้าว ตาฉันแล้วเหรอจ๊ะ', rom: 'oh, dtaa chăn láew rŏr já', en: "Oh, is it my turn?", audio: "grandma_dtaa-chan.mp3" }
	  // Lines spoken after the PLAYER makes a wrong-pair guess.
    ],
    draw: [
      { th: 'ไม่มีใครแพ้จ้ะ', rom: 'mâi mee krai páe jâ', en: 'Nobody lost.', audio: "grandma_mai-mee-krai-pae-ja.mp3" }
    ]
  },
  tuktuk: {
    choose: [
      { th: 'ไปกันเลย', rom: 'bpai gan loie', en: "Let's go.", audio: "tuktuk_bpai-gan-loei.mp3" },
	  { th: 'วันนี้ฝนจะตกนะครับ', rom: 'wan née fŏn jà dtòk ná kráp', en: "It will rain today.", audio: "tuktuk_wan-nee-fon-ja-dtok.mp3" },
	  { th: 'วันนี้รถติดนะครับ', rom: 'wan née rót-dtìt ná kráp', en: "Traffic is bad today.", audio: "tuktuk_wan-nee-rot-dtit.mp3" },
      { th: 'ไปไหนครับ', rom: 'bpai năi kráp', en: 'Where are you going?', audio: "tuktuk_bpai-nai-krap.mp3" }
    ],
    win: [
      { th: 'วันนี้โชคดีมาก', rom: 'wan née chôhk dee mâak', en: "I'm really lucky today.", audio: "tuktuk_wan-nee-chohk-dee-maak.mp3" },
	  { th: 'อย่าเสียใจนะ', rom: 'yàa sĭa jai ná', en: "Don't be sad.", audio: "tuktuk_yaa-sia-jai-na.mp3" },
      { th: 'ดีใจมากเลยครับ', rom: 'dee jai mâak loie kráp', en: "I'm so happy!", audio: "tuktuk_dee-jai-maak-loie-krap.mp3" }
    ],
    lose: [
      { th: 'ไม่เป็นไรครับ', rom: 'mâi bpen rai kráp', en: 'No worries.', audio: "tuktuk_mai-bpen-rai-krap.mp3" },
	  { th: 'เอ๊ะ ทำไมล่ะ', rom: 'eh... tam-mai lâ', en: 'Huh? Why?', audio: "tuktuk_eh-tam-mai-la.mp3" },
	  { th: 'เกมสูสีมาก', rom: 'gem sŏo-sĕe mâak', en: 'That was a very close game.', audio: "tuktuk_gem-soo-see-maak.mp3" },
      { th: 'สนุกมากครับ', rom: 'sà-nùk mâak kráp', en: 'That was fun.', audio: "tuktuk_sanuk-maak-krap.mp3" }
    ],
    gameStart: [
      { th: 'ขอให้สนุกนะ', rom: 'kŏr hâi sà-nùk ná', en: "Have fun.", audio: "tuktuk_kor-hai-sanuk-na.mp3" },
	  { th: 'ปะ', rom: 'bpà', en: "Let's go. (casual)", audio: "tuktuk_bpa.mp3" }
	  // Lines spoken shortly after the game starts.
      // Add { th, rom, en } entries here; if empty (or all entries are blank), no popup will appear.
    ],
    selfStreak: [
      { th: 'วันนี้มือขึ้นนะ', rom: 'wan née meu-kêun ná', en: "I'm on a roll today.", audio: "tuktuk_wan-nee-meu-keun.mp3" },
	  { th: 'ยังไม่เสร็จครับ', rom: 'yang mâi sèt kráp', en: "I'm not done yet.", audio: "tuktuk_yang-mai-set-krap.mp3" }
	  // Lines spoken when THIS character gets a match streak (proud / smug reactions).
    ],
    playerStreak: [
      { th: 'เบา ๆ หน่อย!', rom: 'oh, bao bao nòi', en: "Oh, take it easy on me.", audio: "tuktuk_bao-bao-noi.mp3" },
	  { th: 'คุณเก่งมากเลย', rom: 'kun gèng mâak loie', en: "You're really good.", audio: "tuktuk_kun-geng-maak-loie.mp3" },
	  { th: 'โห เก่งอะ', rom: 'wow, gèng à', en: "Wow, you're good.", audio: "tuktuk_geng-a.mp3" },
	  { th: 'ใจเย็น ๆ', rom: 'jai yen yen', en: "Whoa... calm down.", audio: "tuktuk_jai-yen-yen.mp3" },
	  { th: 'พอเลย', rom: 'por loie', en: "Enough already.", audio: "tuktuk_por-loie.mp3" }
	  // Lines spoken when the PLAYER gets a match streak (CPU reacts).
    ],
    selfMatch: [
      { th: 'โอ้ ดูสิ', rom: 'oh, doo sì', en: "Oh, look!", audio: "tuktuk_doo-si.mp3" },
	  { th: 'คู่นี้ของผมนะ', rom: 'kôo née kŏng pŏm ná', en: "This pair is mine.", audio: "tuktuk_koo-nee-kong-pom-na.mp3" },
	  { th: 'เห็นไหม', rom: 'hĕn măi', en: "See that?", audio: "tuktuk_hen-mai.mp3" }
	  // Lines spoken after THIS character makes a regular (non-streak) match.
    ],
    playerMatch: [
      { th: 'ถูกแล้ว', rom: 'tòok láew', en: "Correct.", audio: "tuktuk_took-laew.mp3" },
	  { th: 'จริงเหรอ', rom: 'jing rŏr', en: "Really?", audio: "tuktuk_jing-ror-tuk.mp3" },
	  { th: 'เจอแล้วเหรอ', rom: 'jer láew rŏr', en: "You found it?", audio: "tuktuk_jer_laew.mp3" }
	  // Lines spoken after the PLAYER makes a regular (non-streak) match.
    ],
    selfMiss: [
      { th: 'เกือบแล้ว', rom: 'gèuap láew', en: "Almost.", audio: "tuktuk_geup-laew.mp3" },
	  { th: 'ลืมแล้ว', rom: 'leum láew', en: "I forgot.", audio: "tuktuk_leum-laew.mp3" },
	  { th: 'เอ๊ะ แปลกจังครับ', rom: 'bplàek jang kráp', en: "Huh, that's strange.", audio: "tuktuk_bplaek-jang-krap.mp3" },
	  { th: 'โอ๊ย จำไม่ได้แล้ว', rom: 'oh, jam mâi dâai láew', en: "Ah, I can't remember anymore.", audio: "tuktuk_jam-mai-tuk.mp3" }
	  // Lines spoken after THIS character makes a wrong-pair guess.
    ],
    playerMiss: [
      { th: 'ตาผมแล้ว', rom: 'dtaa pŏm láew', en: "My turn.", audio: "tuktuk_dtaa-pom-laew.mp3" },
	  { th: 'ลองใหม่นะ', rom: 'long mài ná', en: "Try again.", audio: "tuktuk_long-mai-na.mp3" },
	  { th: 'ไม่ต้องห่วง', rom: 'mâi dtông hùang', en: "No worries.", audio: "tuktuk_mai-dtong-huang.mp3" }
	  // Lines spoken after the PLAYER makes a wrong-pair guess.
    ],
    draw: [
      { th: 'สูสีกันเลยครับ', rom: 'sŏo-sĕe gan loie kráp', en: 'That was close!', audio: "tuktuk_soo-see-gan-loie-krap.mp3" }
    ]
  },
  fighter: {
    choose: [
      { th: 'มาเลยครับ', rom: 'maa loie kráp', en: 'Bring it on!', audio: "fighter_maa-loei-krap.mp3" },
      { th: 'พร้อมยังครับ', rom: 'próm yang kráp', en: 'Are you ready?', audio: "fighter_prom-yang-krap.mp3" },
	  { th: 'เป็นไงบ้าง', rom: 'bpen ngai bâang', en: "How's it going?", audio: "fighter_bpen-ngai-baang.mp3" },
	  { th: 'เร็ว ๆ หน่อยครับ ผมยุ่งมาก', rom: 'reo reo nòi kráp · pŏm yûng mâak', en: "Hurry up, I'm very busy.", audio: "fighter_reo-reo-noi-krap.mp3" }
    ],
    win: [
      { th: 'ชนะแล้วครับ', rom: 'chá-ná láew kráp', en: 'I won!' },
	  { th: 'เจ็บไหมครับ', rom: 'jèp măi kráp', en: 'Did that hurt?' },
      { th: 'ไม่ยากเลยครับ', rom: 'mâi yâak loie kráp', en: 'Not difficult at all.' },
      { th: 'สุดยอด', rom: 'sùt yôt', en: 'Awesome!' }
    ],
    lose: [
      { th: 'เอาอีกสักรอบไหม', rom: 'ao èek sàk rôp măi', en: 'How about another round?' },
      { th: 'น่าเบื่อจังเลย', rom: 'nâa bèua jang loie', en: 'So boring!' },
      { th: 'ไม่น่าเชื่อเลย', rom: 'mâi nâa chêua loie', en: 'Unbelievable!' },
      { th: 'ยินดีด้วย คุณชนะแล้ว', rom: 'yin dee dûay · kun chá-ná láew', en: 'Congratulations, you won!' }
    ],
    gameStart: [
      { th: 'พร้อมแล้ว', rom: 'próm láew', en: "I'm ready.", audio: "fighter_prom-laew.mp3" },
	  { th: 'มาสู้กัน', rom: 'maa sôo gan', en: "Come on, let's fight.", audio: "fighter_maa-soo-gan.mp3" }
	  // Lines spoken shortly after the game starts.
      // Add { th, rom, en } entries here; if empty (or all entries are blank), no popup will appear.
    ],
    selfStreak: [
      { th: 'มาอีกคู่', rom: 'maa èek kôo', en: "Another pair!" },
	  { th: 'งานเข้าแล้วนะ', rom: 'ngaan kâo láew ná', en: "You're in trouble now." }
	  // Lines spoken when THIS character gets a match streak (proud / smug reactions).
    ],
    playerStreak: [
	  { th: 'น่าทึ่งมาก', rom: 'nâa têung mâak', en: "Amazing!" },
	  { th: 'ยังไม่จบนะครับ', rom: 'yang mâi jòp ná kráp', en: "It's not over yet." },
	  { th: 'ยังแม่นอยู่', rom: 'yang mâen yòo', en: "Still accurate!" },
	  { th: 'ไม่น่าเชื่อเลย', rom: 'mâi nâa chêua loie', en: "I can't believe it." }
	  // Lines spoken when the PLAYER gets a match streak (CPU reacts).
    ],
    selfMatch: [
      { th: 'สุดยอด', rom: 'sùt yôt', en: "Awesome!" },
	  { th: 'จำได้แล้ว', rom: 'jam-dâai láew', en: "I remember now." },
	  { th: 'เข้าเป้าเลย', rom: 'kâo bpâo loie', en: "Right on target." }
	  // Lines spoken after THIS character makes a regular (non-streak) match.
    ],
    playerMatch: [
      { th: 'ไม่มีทาง', rom: 'mâi mee taang', en: "No way." },
	  { th: 'หมัดดีนี่', rom: 'màt dee nêe', en: "That's a good punch." },
	  { th: 'โอ๊ย เจ็บนะ', rom: 'ói · jèp ná', en: "Ouch, that hurts." }
	  // Lines spoken after the PLAYER makes a regular (non-streak) match.
    ],
    selfMiss: [
      { th: 'ไม่ดีเลย', rom: 'mâi dee loie', en: "Not good." },
	  { th: 'ผมแค่ประมาทครับ', rom: 'pŏm kâe bprà-màat kráp', en: "I was just careless." },
	  { th: 'ตาคุณแล้วครับ', rom: 'dtaa kun láew kráp', en: "It's your turn." },
	  { th: 'โอ๊ะ พลาด', rom: 'oh, plâat', en: "Oops, missed it." }
	  // Lines spoken after THIS character makes a wrong-pair guess.
    ],
    playerMiss: [
      { th: 'สู้ ๆ', rom: 'sôo sôo', en: "Keep going!" },
	  { th: 'เกือบแล้ว', rom: 'gèuap láew', en: "Almost." },
	  { th: 'เร็ว ๆ หน่อยครับ', rom: 'reo reo nòi kráp', en: "A little faster, please." },
	  { th: 'ตาผมแล้วครับ', rom: 'dtaa pŏm láew kráp', en: "My turn now." }
	  // Lines spoken after the PLAYER makes a wrong-pair guess.
    ],
    draw: [
      { th: 'เก่งเหมือนกันครับ', rom: 'gèng mĕuan gan kráp', en: "You're good too." }
    ]
  },
  student: {
    choose: [
      { th: 'เริ่มได้เลยค่ะ', rom: 'rêrm dâai loie kâ', en: 'We can start now.', audio: "student_rerm-daai-loei.mp3" },
      { th: 'อยากเล่นกับฉันไหมคะ', rom: 'yàak lên gàp chăn măi ká', en: 'You wanna play with me?', audio: "student_yaak-len-gap-chan.mp3" },
	  { th: 'ฉันน่ารักไหม', rom: 'chăn nâa rák măi', en: 'Am I cute?', audio: "student_chan-naarak-mai.mp3" },
      { th: 'ว่าไง', rom: 'wâa ngai', en: "What's up?", audio: "student_waa-ngai.mp3" }
    ],
    win: [
      { th: 'ง่ายกว่าที่คิดนะเนี่ย', rom: 'ngâai gwàa têe kít ná nîa', en: 'Easier than I thought.', audio: "student_ngaai-gwaa.mp3" },
      { th: 'เล่นอีกไหมคะ', rom: 'lên èek măi ká', en: 'Shall we play again?', audio: "student_len-eek.mp3" },
	  { th: 'อย่าเกลียดฉันนะคะ', rom: 'yàa glìat chăn ná ká', en: "Please don't hate me.", audio: "student_yaa-glit.mp3" },
      { th: 'ง่ายจังเลย', rom: 'ngâai jang loie', en: "It's so easy.", audio: "student_ngaai-jang.mp3" }
    ],
    lose: [
      { th: 'ต้องฝึกบ่อยๆแล้วล่ะ', rom: 'dtông fèuk bòi bòi láew lâ', en: 'I need to practice more.', audio: "student_dtong-feuk.mp3" },
      { th: 'ได้ไงอ่ะ', rom: 'dâai ngai à', en: 'How?!', audio: "student_daai-ngai-a.mp3" },
      { th: 'ยอมแล้ว', rom: 'yom láew', en: 'I give up.', audio: "student_yom-laew.mp3" }
    ],
    gameStart: [
      { th: 'ตื่นเต้นจังเลย', rom: 'dtèun dtên jang loie', en: "I'm so excited!", audio: "student_dteaun-dten-jang-loie.mp3" },
	  { th: 'มาเริ่มกันเถอะ', rom: 'maa rêrm gan tùh', en: "Let's start.", audio: "student_maa-rerm-gan-tuh.mp3" },
	  { th: 'มาเล่นกันเถอะ', rom: 'maa lên gan tùh', en: "Let's play.", audio: "student_maa-len-gan-tuh.mp3" }
	  // Lines spoken shortly after the game starts.
      // Add { th, rom, en } entries here; if empty (or all entries are blank), no popup will appear.
    ],
    selfStreak: [
      { th: 'ปัง', rom: 'bpang', en: "Nailed it!", audio: "student_bpang.mp3" },
	  { th: 'เยี่ยมเลย!', rom: 'yîam loie', en: "Excellent!", audio: "student_yiam-loie.mp3" },
	  { th: 'สนุกไหมล่ะ', rom: 'sà-nùk măi lâ', en: "Are you having fun?", audio: "student_sanuk-mai-la.mp3" },
	  { th: 'อย่าเพิ่งยอมแพ้นะ', rom: 'yàa pêrng yom páe ná', en: "Don't give up yet.", audio: "student_yaa-perng.mp3" }
	  // Lines spoken when THIS character gets a match streak (proud / smug reactions).
    ],
    playerStreak: [
	  { th: 'เป๊ะเวอร์', rom: 'bpé wer', en: "Flawless!", audio: "student_bpe-wer.mp3" },
	  { th: 'ไม่น่าเชื่อ', rom: 'mâi nâa chêua', en: "Unbelievable!", audio: "student_mai-naa-cheua.mp3" },
	  { th: 'หนูสู้ไม่ได้เลยค่ะ', rom: 'nŏo sôo mâi dâai loie kâ', en: "I can't keep up.", audio: "student_noo-soo.mp3" },
	  { th: 'อะไรเนี่ย', rom: 'à-rai nîa', en: "What the heck?!", audio: "student_arai-nia.mp3" },
	  { th: 'ใจร้ายจัง', rom: 'jai-ráai jang', en: "You're so mean!", audio: "student_jai-raai-jang.mp3" }
	  // Lines spoken when the PLAYER gets a match streak (CPU reacts).
    ],
    selfMatch: [
      { th: 'เจ๋ง', rom: 'jĕng', en: "Cool!", audio: "student_jeng.mp3" },
	  { th: 'ได้แล้ว', rom: 'dâai láew', en: "Got it!", audio: "student_daai-laew.mp3" },
	  { th: 'หนูเจอแล้วค่ะ', rom: 'nŏo jer láew kâ', en: "I found it.", audio: "student_noo-jer-laew-ka.mp3" },
	   { th: 'เดาถูกด้วย', rom: 'dao tòok dûay', en: "I guessed right!", audio: "student_dao-took-duay.mp3" }
	  // Lines spoken after THIS character makes a regular (non-streak) match.
    ],
    playerMatch: [
      { th: 'ดีเลย', rom: 'dee loie', en: "Nice!", audio: "student_dee-loie.mp3" },
	  { th: 'เดี๋ยวก็ตามทัน', rom: 'dĭeow gôr dtaam tan', en: "I'll catch up soon.", audio: "student_dieow-gor-dtaam-tan.mp3" },
	  { th: 'ทำได้ดีนะ', rom: 'tam dâai dee ná', en: "You're doing well!", audio: "student_tam-daai-dee-na.mp3" },
	  { th: 'งอนแล้วนะ', rom: 'ngon láew ná', en: "I'm sulking now.", audio: "student_ngon-laew-na.mp3" }
	  // Lines spoken after the PLAYER makes a regular (non-streak) match.
    ],
    selfMiss: [
      { th: 'ลืมแล้ว', rom: 'leum láew', en: "I forgot.", audio: "student_laum-laew.mp3" },
	  { th: 'สับสนเอง', rom: 'sàp-sŏn eng', en: "I confused myself.", audio: "student_sap-son-eng.mp3" },
	  { th: 'คิดมากไปเอง', rom: 'kít mâak bpai eng', en: "I overthought it.", audio: "student_kit-maak.mp3" },
	  { th: 'เดินพลาดแล้ว', rom: 'dern plâat láew', en: "That was a bad move.", audio: "student_dern-plaat.mp3" }
	  // Lines spoken after THIS character makes a wrong-pair guess.
    ],
    playerMiss: [
      { th: 'น่ารักอะ', rom: 'nâa rák à', en: "So cute.", audio: "student_naa-rak-a.mp3" },
	  { th: 'อันนั้นก็ได้เหรอ', rom: 'an nán gôr dâai rŏr', en: "That's the one you picked?", audio: "student_an-nan-gor-daai-ror.mp3" },
	  { th: '555 ไม่ใช่นะ', rom: 'hâa hâa hâa, mâi châi ná', en: "Ha-ha-ha, that's not it.", audio: "student_mai-chai.mp3" }
	  // Lines spoken after the PLAYER makes a wrong-pair guess.
    ],
    draw: [
      { th: 'เสมอกันเลยค่ะ', rom: 'sà-mĕr gan loie kâ', en: "It's a tie.", audio: "student_samer-gan-loie.mp3" }
    ]
  },
  lawyer: {
    choose: [
      { th: 'เชิญเลยครับ', rom: 'chern loie kráp', en: 'Please, go ahead.', audio: "lawyer_chern-loei-krap.mp3" },
	  { th: 'ชอบเล่นใช่ไหมครับ', rom: 'chôp lên châi măi kráp', en: "You like playing, don't you?", audio: "lawyer_chop-len-chai-mai-krap.mp3" },
	  { th: 'วันนี้ร้อนมากเลยครับ', rom: 'wan née rón mâak loie kráp', en: "Today's very hot.", audio: "lawyer_wan-nee-ron-maak-krap.mp3" },
	  { th: 'หิวมากเลยครับ', rom: 'hĭw mâak loie kráp', en: "I'm so hungry.", audio: "lawyer_hiw-maak-loei-krap.mp3" },
      { th: 'กินข้าวหรือยังครับ', rom: 'gin kâao rĕu yang kráp', en: 'Have you eaten yet?', audio: "lawyer_gin-kaao-reu-yang-krap.mp3" }
    ],
    win: [
      { th: 'ตามที่คาดไว้', rom: 'dtaam têe kâat wái', en: 'Just as I expected.', audio: "lawyer_dtaam-tee.mp3" },
      { th: 'ขอบคุณสำหรับความสนุก', rom: 'kòp kun săm-ràp kwaam sà-nùk', en: 'Thank you for the fun.', audio: "lawyer_kop-kun-sanuk.mp3" },
      { th: 'ผมรู้อยู่แล้ว', rom: 'pŏm róo yòo láew', en: 'I knew it.', audio: "lawyer_pom-roo-yoo.mp3" }
    ],
    lose: [
      { th: 'น่าอายจัง', rom: 'nâa aai jang', en: 'So embarrassing!', audio: "lawyer_naa-aai-jang.mp3" },
      { th: 'ไม่จริงนะ', rom: 'mâi jing ná', en: "That can't be!", audio: "lawyer_mai-jing-na.mp3" },
      { th: 'ดวงไม่ดี', rom: 'duang mâi dee', en: 'Bad luck.', audio: "lawyer_duang-mai-dee.mp3" },
	  { th: 'ขอคัดค้านนะ', rom: 'kŏr kát káan ná', en: 'I object!', audio: "lawyer_kor-kat-kaan-na.mp3" }
    ],
    gameStart: [
      { th: 'คุณก่อนเลยครับ', rom: 'kun gòn loie kráp', en: "You first.", audio: "lawyer_kun-gon-loie-krap.mp3" },
	  { th: 'ดูไว้ให้ดีนะ', rom: 'doo wái hâi dee ná', en: "Watch closely.", audio: "lawyer_doo-wai-hai-dee-na.mp3" },
	  { th: 'ผมไม่รีบครับ', rom: 'pŏm mâi rêep kráp', en: "I'm in no hurry.", audio: "lawyer_pom-mai-reep-krap.mp3" }
	  // Lines spoken shortly after the game starts.
      // Add { th, rom, en } entries here; if empty (or all entries are blank), no popup will appear.
    ],
    selfStreak: [
      { th: 'เห็นไหมล่ะ', rom: 'hĕn măi lâ', en: "See that?", audio: "lawyer_hen-mai-la.mp3" },
	  { th: 'เป็นไงล่ะ', rom: 'bpen ngai lâ', en: "How about that?", audio: "lawyer_bpen-ngai-la.mp3" },
	  { th: 'ง่ายจะตาย', rom: 'ngâai jà dtaai', en: "Piece of cake.", audio: "lawyer_ngaai-ja-dtaai.mp3" }
	  // Lines spoken when THIS character gets a match streak (proud / smug reactions).
    ],
    playerStreak: [
      { th: 'โชคล้วน ๆ', rom: 'chôhk lúan lúan', en: "Nothing but luck.", audio: "lawyer_chohk-luan.mp3" },
	  { th: 'แค่โชคดีนะ', rom: 'kâe chôhk dee ná', en: "Just lucky, that's all.", audio: "lawyer_kae-chok-dee-na.mp3" },
	  { th: 'น่าสงสัยนะ', rom: 'nâa sŏng-săi ná', en: "Suspicious...", audio: "lawyer_naa-song-sai-na.mp3" },
	  { th: 'ไม่เล่นด้วยแล้ว', rom: 'mâi lên dûay láew', en: "I'm not playing with you anymore.", audio: "lawyer_mai-len-duay.mp3" }
	  // Lines spoken when the PLAYER gets a match streak (CPU reacts).
    ],
    selfMatch: [
	  { th: 'ตามคาด', rom: 'dtaam kâat', en: "As expected.", audio: "lawyer_dtaam-kaat.mp3" },
	  { th: 'ขอโทษนะ ของผมครับ', rom: 'kŏr tôht ná · kŏng pŏm kráp', en: "Sorry, it's mine.", audio: "lawyer_kor-toht.mp3" }
	  // Lines spoken after THIS character makes a regular (non-streak) match.
    ],
    playerMatch: [
      { th: 'บังเอิญนะ', rom: 'bang-ern ná', en: "Just a coincidence.", audio: "lawyer_bang-ern-na.mp3" },
	  { th: 'มือใหม่ดวงดี', rom: 'meu-mài duang dee', en: "Beginner's luck.", audio: "lawyer_meu-mai-duang-dee.mp3" },
	  { th: 'น่าสนใจนะ', rom: 'nâa sŏn jai ná', en: "Interesting...", audio: "lawyer_naa-son-jai.mp3" }
	  // Lines spoken after the PLAYER makes a regular (non-streak) match.
    ],
    selfMiss: [
      // Lines spoken after THIS character makes a wrong-pair guess.
    ],
    playerMiss: [
      { th: 'อย่าทำให้ขำสิ', rom: 'yàa tam hâi kăm sì', en: "Don't make me laugh.", audio: "lawyer_yaa-tam-hai-kam-si.mp3" },
	  { th: 'ชักง่วงแล้ว', rom: 'chák ngûang láew', en: "I'm getting sleepy.", audio: "lawyer_chak-nguang-laew.mp3" },
	  { th: 'น่าเสียดายจังครับ', rom: 'nâa-sĭa-daai jang kráp', en: "What a shame.", audio: "lawyer_naa-sia-daai.mp3" },
	  { th: 'คุณทำได้ดีกว่านี้', rom: 'kun tam dâai dee gwàa née', en: "You can do better than this.", audio: "lawyer_kun-tam-daai-dee.mp3" }
	  // Lines spoken after the PLAYER makes a wrong-pair guess.
    ],
    draw: [
      { th: 'ยุติธรรมดีครับ', rom: 'yút-dtì tam dee kráp', en: 'Fair enough.', audio: "lawyer_yut-dti-tam-dee.mp3" }
    ]
  },
  teacher: {
    choose: [
      { th: 'พร้อมเรียนหรือยังคะ', rom: 'próm rian rĕu yang ká', en: 'Are you ready to study?', audio: "teacher_prom-rian-reu-yang-ka.mp3" },
	  { th: 'สบายดีไหมคะ', rom: 'sà-baai dee măi ká', en: 'How are you?', audio: "teacher_sabai-dee-mai-ka.mp3" },
	  { th: 'มีคำถามไหมคะ', rom: 'mee kam tăam măi ká', en: 'Do you have any questions?', audio: "teacher_mee-kam-taam-mai-ka.mp3" },
	  { th: 'วันนี้อากาศเป็นยังไงบ้างคะ', rom: 'wan née aa-gàat bpen yang ngai bâang ká', en: "How's the weather today?", audio: "teacher_wan-nee-aagaat-bpen-yang.mp3" },
	  { th: 'ตั้งใจนะคะ', rom: 'dtâng jai ná ká', en: 'Pay attention.', audio: "teacher_dtang-jai-na-ka.mp3" }
    ],
    win: [
      { th: 'เข้าใจแล้วใช่ไหมคะ', rom: 'kâo jai láew châi măi ká', en: 'You understand now, right?' },
      { th: 'สนุกไหม', rom: 'sà-nùk măi', en: 'Did you have fun?' },
      { th: 'สู้ ๆ นะคะ', rom: 'sôo sôo ná ká', en: 'Keep going!' }
    ],
    lose: [
      { th: 'เก่งมากเลยค่ะ', rom: 'gèng mâak loie kâ', en: 'Well done!' },
      { th: 'ครูภูมิใจในตัวเธอนะ', rom: 'kroo poom jai nai dtuua ter ná', en: "I'm proud of you." }
    ],
    gameStart: [
      { th: 'ขอให้สนุกนะคะ', rom: 'kŏr hâi sà-nùk ná ká', en: "Have fun.", audio: "teacher_kor-hai-sanuk.mp3" },
	  { th: 'โชคดีนะคะ', rom: 'chôhk dee ná ká', en: "Good luck.", audio: "teacher_chok-dee.mp3" }
	  // Lines spoken shortly after the game starts.
      // Add { th, rom, en } entries here; if empty (or all entries are blank), no popup will appear.
    ],
    selfStreak: [
      // Lines spoken when THIS character gets a match streak (proud / smug reactions).
    ],
    playerStreak: [
      { th: 'เก่งมากค่ะ', rom: 'gèng mâak kâ', en: "Great job!" },
	  { th: 'ยินดีด้วยค่ะ', rom: 'yin-dee-dûay kâ', en: "Congratulations!" }
	  // Lines spoken when the PLAYER gets a match streak (CPU reacts).
    ],
    selfMatch: [
      // Lines spoken after THIS character makes a regular (non-streak) match.
    ],
    playerMatch: [
      { th: 'ถูกต้องค่ะ', rom: 'tòok dtông kâ', en: "That's correct." },
	  { th: 'ดีมากค่ะ', rom: 'dee mâak kâ', en: "Very good." }
	  // Lines spoken after the PLAYER makes a regular (non-streak) match.
    ],
    selfMiss: [
      { th: 'ต้องตั้งใจหน่อย', rom: 'dtông dtâng-jai nòi', en: "I need to pay more attention." },
	  { th: 'ใจลอยอีกแล้ว', rom: 'jai-loi èek láew', en: "I'm daydreaming again." },
	  { th: 'ไม่แน่ใจค่ะ', rom: 'mâi nâe jai kâ', en: "I'm not sure." }
	  // Lines spoken after THIS character makes a wrong-pair guess.
    ],
    playerMiss: [
      // Lines spoken after the PLAYER makes a wrong-pair guess.
    ],
    draw: [
      { th: 'เกือบชนะครูแล้วนะคะ', rom: 'gèuap chá-ná kroo láew ná ká', en: 'You almost beat me.' }
    ]
  }
};
