import re


WEAK_WORDS = {
    "very",
    "really",
    "just",
    "quite",
    "actually",
    "basically",
    "literally",
    "perhaps",
    "somewhat",
    "rather",
    "slightly",
    "things",
    "stuff",
    "a lot",
}


STOPWORDS = {
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "of",
    "to",
    "in",
    "on",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "it",
    "that",
    "this",
    "for",
    "with",
    "as",
    "at",
    "by",
    "from",
    "i",
    "you",
    "we",
    "they",
    "he",
    "she",
    "his",
    "her",
    "our",
    "their",
    "my",
    "your",
}


def split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [part for part in parts if part]


def count_words(text: str) -> list[str]:
    return re.findall(r"\b\w+\b", text)


def word_count(text: str) -> dict:
    words = count_words(text)
    sentences = split_sentences(text)

    average = (
        round(len(words) / len(sentences), 1)
        if sentences
        else 0
    )

    return {
        "words": len(words),
        "sentences": len(sentences),
        "characters": len(text),
        "avg_sentence_length": average,
    }


def count_syllables(word: str) -> int:
    word = word.lower()

    if not word:
        return 0

    vowels = "aeiouy"
    count = 0
    previous_vowel = False

    for char in word:
        is_vowel = char in vowels

        if is_vowel and not previous_vowel:
            count += 1

        previous_vowel = is_vowel

    if word.endswith("e") and count > 1:
        count -= 1

    return max(count, 1)


def readability_score(text: str) -> dict:
    words = count_words(text)
    sentences = split_sentences(text)

    if not words or not sentences:
        return {
            "score": 0,
            "interpretation": "Not enough text to score.",
        }

    syllables = sum(
        count_syllables(word)
        for word in words
    )

    score = (
        206.835
        - 1.015 * (len(words) / len(sentences))
        - 84.6 * (syllables / len(words))
    )

    score = round(score, 1)

    if score >= 70:
        interpretation = "Easy to read."
    elif score >= 60:
        interpretation = "Plain English."
    elif score >= 50:
        interpretation = "Fairly difficult."
    elif score >= 30:
        interpretation = "Difficult."
    else:
        interpretation = "Very difficult."

    return {
        "score": score,
        "interpretation": interpretation,
    }


def find_weak_words(text: str) -> dict:
    words = re.findall(
        r"\b\w+\b",
        text.lower()
    )

    occurrences = {}

    for word in words:
        if word in WEAK_WORDS:
            occurrences[word] = (
                occurrences.get(word, 0) + 1
            )

    return {
        "count": sum(occurrences.values()),
        "occurrences": occurrences,
    }


def find_long_sentences(
    text: str,
    max_words: int = 25
) -> dict:

    flagged = []

    for sentence in split_sentences(text):
        word_total = len(count_words(sentence))

        if word_total > max_words:
            flagged.append({
                "sentence": sentence,
                "word_count": word_total,
            })

    return {
        "count": len(flagged),
        "sentences": flagged,
    }


def find_repeated_words(
    text: str,
    min_repeats: int = 3
) -> dict:

    words = re.findall(
        r"\b\w+\b",
        text.lower()
    )

    counts = {}

    for word in words:

        if word in STOPWORDS or len(word) < 3:
            continue

        counts[word] = counts.get(word, 0) + 1

    repeated = {
        word: count
        for word, count in counts.items()
        if count >= min_repeats
    }

    return {
        "count": len(repeated),
        "words": repeated,
    }


def analyze_text(text: str) -> dict:
    return {
        "word_count": word_count(text),
        "readability": readability_score(text),
        "weak_words": find_weak_words(text),
        "long_sentences": find_long_sentences(text),
        "repeated_words": find_repeated_words(text),
    }