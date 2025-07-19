// Feelings Wheel Data - Exact match to reference image provided by user
const FEELINGS_DATA = {
    // Core emotions (center circle) - 7 primary emotions in clockwise order starting with Angry at 0°
    core: [
        { name: "Angry", color: "#FFB3B3" }, // Pastel Red - at 0 degrees
        { name: "Disgusted", color: "#D3D3D3" }, // Gray
        { name: "Sad", color: "#B3C6FF" }, // Pastel Blue
        { name: "Happy", color: "#FFFF99" }, // Pastel Yellow
        { name: "Surprised", color: "#D4B3FF" }, // Pastel Purple  
        { name: "Bad", color: "#B3FFB3" }, // Pastel Green
        { name: "Fearful", color: "#FFD4A3" } // Pastel Orange
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

    // ===== CENTRALIZED COLOR SYSTEM =====
    // This is the single source of truth for all emotion colors
    getEmotionColor(wedgeId) {
        // Parse the wedge ID to get components
        const parts = wedgeId.split('-');
        const level = parts[0];
        
        // Determine the core family based on the wedge ID format
        let coreFamily;
        if (level === 'core') {
            coreFamily = parts[1];
        } else if (level === 'secondary') {
            coreFamily = parts[1]; // Core family is always at position 1
        } else if (level === 'tertiary') {
            coreFamily = parts[1]; // Core family is always at position 1 for family-aware IDs
        }
        
        if (coreFamily) {
            // Find the core emotion color
            const coreEmotion = this.core.find(core => core.name === coreFamily);
            if (coreEmotion) {
                let familyColor = coreEmotion.color;
                
                // Apply lightening based on level (same as wheel generation)
                if (level === 'secondary') {
                    familyColor = this.lightenColor(familyColor, 40);
                } else if (level === 'tertiary') {
                    familyColor = this.lightenColor(familyColor, 70);
                }
                
                return familyColor;
            }
        }
        
        // Final fallback to level-based colors
        const fallbackMap = {
            'core': '#4a90e2',
            'secondary': '#7bb3f2', 
            'tertiary': '#a8d0f7'
        };
        
        return fallbackMap[level] || '#4a90e2';
    },
    
    // Get core emotion color for tile accents (no lightening applied)
    getCoreEmotionColor(wedgeId) {
        // Parse the wedge ID to get components
        const parts = wedgeId.split('-');
        const level = parts[0];
        
        // Determine the core family based on the wedge ID format
        let coreFamily;
        if (level === 'core') {
            coreFamily = parts[1];
        } else if (level === 'secondary') {
            coreFamily = parts[1]; // Core family is always at position 1
        } else if (level === 'tertiary') {
            coreFamily = parts[1]; // Core family is always at position 1 for family-aware IDs
        }
        
        if (coreFamily) {
            // Find the core emotion color and return it directly (no lightening)
            const coreEmotion = this.core.find(core => core.name === coreFamily);
            if (coreEmotion) {
                return coreEmotion.color;
            }
        }
        
        // Fallback to core color
        return '#4a90e2';
    },

    // Helper function to lighten colors (FIXED: proper lightening algorithm)
    lightenColor(color, percent) {
        // Parse hex color
        const num = parseInt(color.replace("#", ""), 16);
        const R = (num >> 16) & 0xFF;
        const G = (num >> 8) & 0xFF; 
        const B = num & 0xFF;
        
        // Apply lightening: blend with white
        const factor = percent / 100;
        const newR = Math.round(R + (255 - R) * factor);
        const newG = Math.round(G + (255 - G) * factor);
        const newB = Math.round(B + (255 - B) * factor);
        
        // Convert back to hex
        return "#" + ((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1);
    },

    // ===== EMOTION-SPECIFIC DEFINITIONS =====
    // Sources: APA Dictionary of Psychology, Emotion-Based Therapy literature, 
    // Oxford Dictionary of Psychology, Cambridge Dictionary of Psychology
    definitions: {
        // CORE EMOTIONS - Primary emotional states
        "Happy": {
            standard: "A positive emotional state characterized by feelings of joy, satisfaction, contentment, and fulfillment. Associated with pleasant thoughts, increased energy, and a general sense of well-being.",
            simplified: "Feeling good, joyful, and pleased with things around you."
        },
        "Sad": {
            standard: "An emotional state characterized by feelings of loss, disappointment, grief, helplessness, and reduced mood. Often occurs in response to perceived or actual loss.",
            simplified: "Feeling unhappy, down, or hurt about something that happened."
        },
        "Angry": {
            standard: "An emotional response to perceived threats, injustice, or frustration. Characterized by feelings of hostility, irritability, and often accompanied by physiological arousal.",
            simplified: "Feeling mad or upset when something isn't fair or bothers you."
        },
        "Fearful": {
            standard: "An adaptive emotional response to perceived danger or threat. Involves physiological arousal and motivates protective behaviors such as avoidance or escape.",
            simplified: "Feeling scared or worried that something bad might happen."
        },
        "Surprised": {
            standard: "A brief emotional response to unexpected events or information. Characterized by momentary disorientation and heightened attention to the surprising stimulus.",
            simplified: "Feeling shocked or amazed by something you didn't expect."
        },
        "Disgusted": {
            standard: "An emotional response to offensive, revolting, or morally objectionable stimuli. Serves as protection from potentially harmful or contaminating substances or situations.",
            simplified: "Feeling sick, yucky, or grossed out by something."
        },
        "Bad": {
            standard: "A general negative emotional state encompassing discomfort, dissatisfaction, unease, or distress without a specific identifiable cause.",
            simplified: "Feeling not good, uncomfortable, or like something is wrong."
        },

        // SECONDARY EMOTIONS - Angry Family
        "Let Down": {
            standard: "The emotional experience of disappointment when expectations or hopes are not met, particularly by someone trusted or relied upon.",
            simplified: "Feeling sad when someone doesn't do what they promised or what you hoped for."
        },
        "Humiliated": {
            standard: "A painful emotional state involving feelings of shame, embarrassment, and loss of dignity, often in the presence of others.",
            simplified: "Feeling very embarrassed and hurt when others see you in a bad way."
        },
        "Bitter": {
            standard: "A persistent emotional state characterized by resentment, cynicism, and anger, often resulting from perceived unfairness or repeated disappointments.",
            simplified: "Feeling angry and hurt for a long time about something unfair that happened."
        },
        "Mad": {
            standard: "An intense emotional state of anger characterized by strong feelings of annoyance, fury, or wrath in response to perceived provocation.",
            simplified: "Feeling very angry and upset about something."
        },
        "Aggressive": {
            standard: "An emotional and behavioral state characterized by hostile feelings and actions intended to assert dominance or cause harm.",
            simplified: "Feeling like you want to fight or be mean to others."
        },
        "Frustrated": {
            standard: "The emotional response to being blocked from achieving a goal or desire, characterized by feelings of annoyance and tension.",
            simplified: "Feeling upset when you can't do what you want or when things don't work."
        },
        "Distant": {
            standard: "An emotional state of withdrawal characterized by feelings of disconnection, emotional unavailability, and reduced engagement with others.",
            simplified: "Feeling far away from others and not wanting to be close or talk."
        },
        "Critical": {
            standard: "An emotional stance characterized by fault-finding, judgment, and the tendency to focus on negative aspects or flaws.",
            simplified: "Feeling like you want to point out what's wrong with things or people."
        },

        // SECONDARY EMOTIONS - Disgusted Family  
        "Disapproving": {
            standard: "An emotional response involving negative judgment and rejection of someone's actions, choices, or character.",
            simplified: "Feeling like someone did something wrong or bad."
        },
        "Disappointed": {
            standard: "The emotional experience when outcomes fall short of expectations, hopes, or desires, often involving sadness and regret.",
            simplified: "Feeling sad when something doesn't turn out the way you wanted."
        },
        "Awful": {
            standard: "An emotional state of extreme discomfort, revulsion, or distress in response to deeply unpleasant experiences or stimuli.",
            simplified: "Feeling really, really bad about something terrible."
        },
        "Repelled": {
            standard: "A strong emotional response of aversion and rejection, often involving physical and emotional withdrawal from disturbing stimuli.",
            simplified: "Feeling like you want to get away from something gross or scary."
        },

        // SECONDARY EMOTIONS - Sad Family
        "Hurt": {
            standard: "An emotional response to perceived injury, slight, or rejection, often involving feelings of pain, vulnerability, and wounded feelings.",
            simplified: "Feeling pain in your heart when someone is mean to you or something bad happens."
        },
        "Depressed": {
            standard: "A persistent emotional state characterized by sadness, hopelessness, low energy, and diminished interest in activities once found pleasurable.",
            simplified: "Feeling very sad and tired for a long time, like nothing is fun anymore."
        },
        "Guilty": {
            standard: "An emotional response to actual or perceived wrongdoing, characterized by remorse, regret, and the desire to make amends.",
            simplified: "Feeling bad because you think you did something wrong."
        },
        "Despair": {
            standard: "A profound emotional state of hopelessness and dejection, often involving the belief that suffering will continue indefinitely.",
            simplified: "Feeling like nothing will ever get better and there's no hope."
        },
        "Vulnerable": {
            standard: "An emotional state of openness combined with uncertainty and emotional risk, often involving feelings of exposure and defenselessness.",
            simplified: "Feeling like you could get hurt easily and need protection."
        },
        "Lonely": {
            standard: "The subjective emotional experience of isolation and disconnection from others, regardless of the actual amount of social contact.",
            simplified: "Feeling alone and sad because you want to be with other people."
        },

        // SECONDARY EMOTIONS - Happy Family
        "Playful": {
            standard: "An emotional state characterized by lightheartedness, spontaneity, and the desire to engage in fun, recreational activities.",
            simplified: "Feeling silly, fun, and like you want to play and laugh."
        },
        "Content": {
            standard: "A peaceful emotional state of satisfaction and acceptance with current circumstances, without strong desires for change.",
            simplified: "Feeling happy and okay with how things are right now."
        },
        "Interested": {
            standard: "An emotional state of curiosity and engagement, characterized by focused attention and desire to learn or explore.",
            simplified: "Feeling curious and excited to learn about something new."
        },
        "Proud": {
            standard: "A positive emotional response to personal achievements or the accomplishments of those with whom one identifies.",
            simplified: "Feeling good about something you did well or accomplished."
        },
        "Accepted": {
            standard: "The emotional experience of being welcomed, valued, and included by others without judgment or conditions.",
            simplified: "Feeling like others like you and want you around just as you are."
        },
        "Powerful": {
            standard: "An emotional state characterized by feelings of strength, capability, confidence, and the ability to influence outcomes.",
            simplified: "Feeling strong, capable, and like you can do important things."
        },
        "Peaceful": {
            standard: "A calm emotional state characterized by tranquility, serenity, and the absence of internal conflict or distress.",
            simplified: "Feeling calm, quiet, and relaxed inside."
        },
        "Trusting": {
            standard: "An emotional state of confidence and faith in the reliability, integrity, and benevolence of others or situations.",
            simplified: "Feeling safe and believing that others will be good to you."
        },
        "Optimistic": {
            standard: "An emotional disposition characterized by hope, positive expectations, and the tendency to expect favorable outcomes.",
            simplified: "Feeling hopeful and believing that good things will happen."
        },

        // SECONDARY EMOTIONS - Surprised Family
        "Startled": {
            standard: "A sudden emotional and physical response to unexpected stimuli, characterized by brief alarm and heightened alertness.",
            simplified: "Feeling suddenly scared or surprised by something that happened quickly."
        },
        "Confused": {
            standard: "An emotional state of uncertainty and bewilderment when unable to understand or make sense of information or situations.",
            simplified: "Feeling mixed up and not understanding what's happening."
        },
        "Amazed": {
            standard: "An emotional response of wonder and admiration to extraordinary, impressive, or unexpected phenomena.",
            simplified: "Feeling really surprised and impressed by something awesome."
        },
        "Excited": {
            standard: "An emotional state of heightened arousal and enthusiasm, often in anticipation of or response to positive events.",
            simplified: "Feeling happy, energetic, and looking forward to something fun."
        },

        // SECONDARY EMOTIONS - Bad Family
        "Bored": {
            standard: "An emotional state characterized by lack of interest, engagement, or stimulation, often accompanied by restlessness.",
            simplified: "Feeling like nothing is interesting or fun to do."
        },
        "Busy": {
            standard: "An emotional state of feeling overwhelmed by excessive activity, tasks, or obligations, often accompanied by stress.",
            simplified: "Feeling like you have too many things to do and not enough time."
        },
        "Stressed": {
            standard: "An emotional and physiological response to demanding situations that exceed one's perceived ability to cope effectively.",
            simplified: "Feeling worried and tight inside because of too much pressure."
        },
        "Tired": {
            standard: "An emotional and physical state of depletion characterized by reduced energy, motivation, and cognitive capacity.",
            simplified: "Feeling like you need rest and don't have energy to do things."
        },

        // SECONDARY EMOTIONS - Fearful Family
        "Scared": {
            standard: "An emotional response to immediate or perceived danger, characterized by alarm, apprehension, and the impulse to flee or hide.",
            simplified: "Feeling afraid that something bad is going to happen to you."
        },
        "Anxious": {
            standard: "An emotional state of worry, nervousness, and apprehension, often about uncertain future events or potential threats.",
            simplified: "Feeling worried and nervous about something that might happen."
        },
        "Insecure": {
            standard: "An emotional state characterized by self-doubt, uncertainty about one's worth, and fear of judgment or rejection by others.",
            simplified: "Feeling unsure about yourself and worried that others might not like you."
        },
        "Weak": {
            standard: "An emotional state of feeling powerless, inadequate, or lacking in strength to handle challenges or difficulties.",
            simplified: "Feeling like you're not strong enough or good enough to do things."
        },
        "Rejected": {
            standard: "The painful emotional experience of being excluded, dismissed, or unwanted by others or groups.",
            simplified: "Feeling hurt because someone doesn't want to be with you or include you."
        },
        "Threatened": {
            standard: "An emotional response to perceived danger or potential harm to one's well-being, safety, or important values.",
            simplified: "Feeling like someone or something might hurt you or take away something important."
        },

        // TERTIARY EMOTIONS - Additional emotional granularity
        "Betrayed": {
            standard: "The profound emotional pain experienced when someone trusted violates that trust through deception or disloyalty.",
            simplified: "Feeling hurt because someone you trusted did something mean behind your back."
        },
        "Resentful": {
            standard: "A persistent emotion of indignation and ill-will toward someone perceived as having caused injury or injustice.",
            simplified: "Feeling angry at someone for a long time because they hurt you."
        },
        "Furious": {
            standard: "An intense state of rage characterized by overwhelming anger and loss of emotional control.",
            simplified: "Feeling so angry that you feel like you might explode."
        },
        "Jealous": {
            standard: "An emotional response involving fear of losing someone's affection or attention to a rival, often accompanied by resentment.",
            simplified: "Feeling upset because you think someone else might take away something or someone you care about."
        },
        "Overwhelmed": {
            standard: "An emotional state of being completely overcome by intense feelings, situations, or responsibilities beyond one's capacity to cope.",
            simplified: "Feeling like everything is too much and you can't handle it all."
        },
        "Grief": {
            standard: "The deep emotional suffering experienced in response to loss, particularly the death of someone loved or valued.",
            simplified: "Feeling very sad because someone or something important is gone forever."
        },
        "Ashamed": {
            standard: "A painful emotion arising from the consciousness of something dishonoring or ridiculous in one's conduct or circumstances.",
            simplified: "Feeling bad about yourself because you think you did something wrong or embarrassing."
        },
        "Joyful": {
            standard: "An intense emotional state of happiness characterized by feelings of great pleasure, delight, and celebration.",
            simplified: "Feeling so happy that you want to sing, dance, or celebrate."
        },
        "Confident": {
            standard: "An emotional state of self-assurance and belief in one's abilities, judgment, and capacity to succeed.",
            simplified: "Feeling sure about yourself and believing you can do things well."
        },
        "Hopeful": {
            standard: "An emotional state characterized by expectation and desire for positive outcomes, accompanied by belief in the possibility of fulfillment.",
            simplified: "Feeling like good things will happen and everything will work out okay."
        },
        "Worried": {
            standard: "An emotional state of anxiety and concern about potential problems, dangers, or uncertainties.",
            simplified: "Feeling scared and thinking about bad things that might happen."
        },
        "Abandoned": {
            standard: "The profound emotional experience of being left behind, deserted, or given up by those who were expected to provide care or support.",
            simplified: "Feeling alone and scared because someone important left you."
        },
        "Isolated": {
            standard: "The emotional experience of being separated or cut off from others, often accompanied by feelings of loneliness and disconnection.",
            simplified: "Feeling alone and far away from other people."
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FEELINGS_DATA;
} 