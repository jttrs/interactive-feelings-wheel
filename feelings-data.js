// Feelings Wheel Data - Exact match to reference image provided by user
const FEELINGS_DATA = {
    // Core emotions (center circle) - 7 primary emotions in clockwise order starting with Angry at 0°
    // Colors designed using modern design system principles with balanced saturation and accessibility
    core: [
        { name: "Angry", color: "#D73527" }, // Balanced red - assertive but not overwhelming
        { name: "Disgusted", color: "#8B7355" }, // Warm brown-gray - natural aversion response
        { name: "Sad", color: "#4A90B8" }, // Deep muted blue - contemplative and calm
        { name: "Happy", color: "#F4C430" }, // Warm golden yellow - optimistic but not harsh
        { name: "Surprised", color: "#8E6EB7" }, // Sophisticated purple - wonder and curiosity
        { name: "Bad", color: "#7A9B76" }, // Muted sage green - grounding and stable
        { name: "Fearful", color: "#DA8B47" } // Warm amber - alert but not alarming
    ],

    // Secondary emotions (middle ring) - reading clockwise from reference image
    secondary: {
        "Angry": [
            "Let Down",
            "Humiliated", 
            "Bitter",
            "Mad",
            "Aggressive",
            "Frustrated",
            "Distant",
            "Critical"
        ],
        "Disgusted": [
            "Disapproving",
            "Disappointed",
            "Awful",
            "Repelled"
        ],
        "Sad": [
            "Hurt",
            "Depressed",
            "Guilty",
            "Despair",
            "Vulnerable",
            "Lonely"
        ],
        "Happy": [
            "Playful",
            "Content",
            "Interested",
            "Proud",
            "Accepted",
            "Powerful",
            "Peaceful",
            "Trusting",
            "Optimistic"
        ],
        "Surprised": [
            "Startled",
            "Confused", 
            "Amazed",
            "Excited"
        ],
        "Bad": [
            "Bored",
            "Busy",
            "Stressed", 
            "Tired"
        ],
        "Fearful": [
            "Scared",
            "Anxious",
            "Insecure",
            "Weak", 
            "Rejected",
            "Threatened"
        ]
    },

    // Tertiary emotions (outer ring) - each secondary emotion has 2 tertiary emotions
    tertiary: {
        "Let Down": ["Betrayed", "Resentful"],
        "Humiliated": ["Disrespected", "Ridiculed"],
        "Bitter": ["Indignant", "Violated"],
        "Mad": ["Furious", "Jealous"],
        "Aggressive": ["Provoked", "Hostile"],
        "Frustrated": ["Infuriated", "Annoyed"],
        "Distant": ["Withdrawn", "Numb"],
        "Critical": ["Skeptical", "Dismissive"],
        
        "Disapproving": ["Judgmental", "Embarrassed"],
        "Disappointed": ["Appalled", "Revolted"],
        "Awful": ["Nauseated", "Detestable"],
        "Repelled": ["Horrified", "Hesitant"],
        
        "Hurt": ["Embarrassed", "Disappointed"],
        "Depressed": ["Inferior", "Empty"],
        "Guilty": ["Remorseful", "Ashamed"],
        "Despair": ["Powerless", "Grief"],
        "Vulnerable": ["Fragile", "Victimized"],
        "Lonely": ["Abandoned", "Isolated"],
        
        "Playful": ["Aroused", "Cheeky"],
        "Content": ["Free", "Joyful"],
        "Interested": ["Curious", "Inquisitive"],
        "Proud": ["Successful", "Confident"],
        "Accepted": ["Respected", "Valued"],
        "Powerful": ["Courageous", "Creative"],
        "Peaceful": ["Loving", "Thankful"],
        "Trusting": ["Sensitive", "Intimate"],
        "Optimistic": ["Hopeful", "Inspired"],
        
        "Startled": ["Shocked", "Dismayed"],
        "Confused": ["Disillusioned", "Perplexed"],
        "Amazed": ["Astonished", "Awed"],
        "Excited": ["Eager", "Energetic"],
        
        "Bored": ["Indifferent", "Apathetic"],
        "Busy": ["Pressured", "Rushed"],
        "Stressed": ["Overwhelmed", "Out of Control"],
        "Tired": ["Sleepy", "Unfocused"],
        
        "Scared": ["Helpless", "Frightened"],
        "Anxious": ["Overwhelmed", "Worried"],
        "Insecure": ["Inadequate", "Inferior"],
        "Weak": ["Worthless", "Insignificant"],
        "Rejected": ["Excluded", "Persecuted"],
        "Threatened": ["Nervous", "Exposed"]
    },

    // Emotion definitions
    definitions: {
        // Core emotions
        "Happy": "A feeling of joy, pleasure, or contentment.",
        "Surprised": "A feeling of mild astonishment or shock caused by something unexpected.",
        "Bad": "Feeling unwell, uncomfortable, or distressed.",
        "Fearful": "Feeling afraid or anxious about something.",
        "Angry": "Feeling or showing strong annoyance, displeasure, or hostility.",
        "Disgusted": "Feeling revulsion or strong disapproval.",
        "Sad": "Feeling sorrow or unhappiness.",
        
        // Additional definitions would go here for all emotions...
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FEELINGS_DATA;
} 