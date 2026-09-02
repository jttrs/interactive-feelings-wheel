// Feelings Wheel Data - Exact match to reference image provided by user
export const FEELINGS_DATA = {
    // Core emotions (center circle) - 7 primary emotions in clockwise order starting with Angry at 0°
    core: [
        { name: 'Angry', color: '#FFB3B3' }, // Pastel Red - at 0 degrees
        { name: 'Disgusted', color: '#D3D3D3' }, // Gray
        { name: 'Sad', color: '#B3C6FF' }, // Pastel Blue
        { name: 'Happy', color: '#FFFF99' }, // Pastel Yellow
        { name: 'Surprised', color: '#D4B3FF' }, // Pastel Purple
        { name: 'Bad', color: '#B3FFB3' }, // Pastel Green
        { name: 'Fearful', color: '#FFD4A3' }, // Pastel Orange
    ],

    // Secondary emotions (middle ring) - reading clockwise from reference image
    secondary: {
        Angry: [
            'Let Down',
            'Humiliated',
            'Bitter',
            'Mad',
            'Aggressive',
            'Frustrated',
            'Distant',
            'Critical',
        ],
        Disgusted: ['Disapproving', 'Disappointed', 'Awful', 'Repelled'],
        Sad: ['Hurt', 'Depressed', 'Guilty', 'Despair', 'Vulnerable', 'Lonely'],
        Happy: [
            'Playful',
            'Content',
            'Interested',
            'Proud',
            'Accepted',
            'Powerful',
            'Peaceful',
            'Trusting',
            'Optimistic',
        ],
        Surprised: ['Startled', 'Confused', 'Amazed', 'Excited'],
        Bad: ['Bored', 'Busy', 'Stressed', 'Tired'],
        Fearful: ['Scared', 'Anxious', 'Insecure', 'Weak', 'Rejected', 'Threatened'],
    },

    // Tertiary emotions (outer ring) - each secondary emotion has 2 tertiary emotions
    tertiary: {
        'Let Down': ['Betrayed', 'Resentful'],
        Humiliated: ['Disrespected', 'Ridiculed'],
        Bitter: ['Indignant', 'Violated'],
        Mad: ['Furious', 'Jealous'],
        Aggressive: ['Provoked', 'Hostile'],
        Frustrated: ['Infuriated', 'Annoyed'],
        Distant: ['Withdrawn', 'Numb'],
        Critical: ['Skeptical', 'Dismissive'],

        Disapproving: ['Judgmental', 'Embarrassed'],
        Disappointed: ['Appalled', 'Revolted'],
        Awful: ['Nauseated', 'Detestable'],
        Repelled: ['Horrified', 'Hesitant'],

        Hurt: ['Embarrassed', 'Disappointed'],
        Depressed: ['Inferior', 'Empty'],
        Guilty: ['Remorseful', 'Ashamed'],
        Despair: ['Powerless', 'Grief'],
        Vulnerable: ['Fragile', 'Victimized'],
        Lonely: ['Abandoned', 'Isolated'],

        Playful: ['Aroused', 'Cheeky'],
        Content: ['Free', 'Joyful'],
        Interested: ['Curious', 'Inquisitive'],
        Proud: ['Successful', 'Confident'],
        Accepted: ['Respected', 'Valued'],
        Powerful: ['Courageous', 'Creative'],
        Peaceful: ['Loving', 'Thankful'],
        Trusting: ['Sensitive', 'Intimate'],
        Optimistic: ['Hopeful', 'Inspired'],

        Startled: ['Shocked', 'Dismayed'],
        Confused: ['Disillusioned', 'Perplexed'],
        Amazed: ['Astonished', 'Awed'],
        Excited: ['Eager', 'Energetic'],

        Bored: ['Indifferent', 'Apathetic'],
        Busy: ['Pressured', 'Rushed'],
        Stressed: ['Overwhelmed', 'Out of Control'],
        Tired: ['Sleepy', 'Unfocused'],

        Scared: ['Helpless', 'Frightened'],
        Anxious: ['Overwhelmed', 'Worried'],
        Insecure: ['Inadequate', 'Inferior'],
        Weak: ['Worthless', 'Insignificant'],
        Rejected: ['Excluded', 'Persecuted'],
        Threatened: ['Nervous', 'Exposed'],
    },

    // ===== CENTRALIZED COLOR SYSTEM =====
    // Single source of truth for emotion colors. Callers pass a core family NAME
    // (e.g. "Angry") rather than a wedge-id string, so this layer stays decoupled
    // from the id encoding used by the wheel engine.
    getCoreEmotionColor(family) {
        const coreEmotion = this.core.find((core) => core.name === family);
        return coreEmotion ? coreEmotion.color : '#4a90e2';
    },

    // Helper function to lighten colors (FIXED: proper lightening algorithm)
    lightenColor(color, percent) {
        // Parse hex color
        const num = parseInt(color.replace('#', ''), 16);
        const R = (num >> 16) & 0xff;
        const G = (num >> 8) & 0xff;
        const B = num & 0xff;

        // Apply lightening: blend with white
        const factor = percent / 100;
        const newR = Math.round(R + (255 - R) * factor);
        const newG = Math.round(G + (255 - G) * factor);
        const newB = Math.round(B + (255 - B) * factor);

        // Convert back to hex
        return '#' + ((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1);
    },

    // ===== EMOTION-SPECIFIC DEFINITIONS =====
    // Sources: APA Dictionary of Psychology, Emotion-Based Therapy literature,
    // Oxford Dictionary of Psychology, Cambridge Dictionary of Psychology
    definitions: {
        // Definitions sourced + reconciled from docs/definitions/ (lexical + therapeutic research).
        // CORE
        Angry: {
            standard:
                'A hot, energizing response that flares when something feels unfair, blocked, or crossed — it flags a boundary or need, and isn\'t "bad."',
            simplified: 'A strong, heated feeling when something feels unfair or gets in your way.',
        },
        Disgusted: {
            standard:
                'A recoiling "get this away from me" reaction toward something that feels wrong, tainted, or repellent — physically or morally.',
            simplified: 'Feeling grossed out or turned off by something that seems wrong or yucky.',
        },
        Sad: {
            standard:
                'A heavy, slowed-down feeling of loss or lack that asks you to pause, grieve, and often reach for comfort.',
            simplified: "Feeling heavy and down about a loss or something you're missing.",
        },
        Happy: {
            standard:
                'A warm, open, expansive good feeling — the whole bright range from quiet contentment to real joy.',
            simplified: 'Feeling good, light, and glad inside.',
        },
        Surprised: {
            standard:
                "A sudden jolt when reality doesn't match what you expected — a brief, wide-open pause before you know how to feel.",
            simplified: "A quick jolt when something happens that you didn't expect.",
        },
        Bad: {
            standard:
                'A general "something\'s off" state — low, uneasy, or drained — before you\'ve pinned down exactly what it is.',
            simplified: 'Feeling off or not good inside, without knowing quite why.',
        },
        Fearful: {
            standard:
                'An alert, protective response to threat or danger, real or imagined, that readies you to get safe.',
            simplified: 'Feeling scared that something bad might happen.',
        },

        // SECONDARY
        'Let Down': {
            standard:
                "The sinking feeling when someone or something you counted on didn't come through.",
            simplified: "Feeling low when someone didn't do what you hoped or promised.",
        },
        Humiliated: {
            standard:
                'A deeply exposed, shrinking pain of being made to feel small in front of others.',
            simplified: 'Feeling very small and hurt when others saw you put down.',
        },
        Bitter: {
            standard:
                "Anger that has hardened over time into resentment — an old hurt that won't let go.",
            simplified: 'Staying angry and hurt for a long time about something unfair.',
        },
        Mad: {
            standard:
                'The everyday heat of anger — worked up and worked over by something that got to you.',
            simplified: 'Feeling angry and worked up about something.',
        },
        Aggressive: {
            standard:
                'Anger turned outward and forceful — the urge to push, confront, or take charge.',
            simplified: 'Feeling like you want to push back hard or take control.',
        },
        Frustrated: {
            standard: 'The tense "I\'m blocked" feeling when your effort keeps hitting a wall.',
            simplified: "Feeling stuck and annoyed when you can't do what you want.",
        },
        Distant: {
            standard:
                'Emotionally pulled back and disconnected — present, but not really *with* others.',
            simplified: "Feeling far away from people, like you can't connect.",
        },
        Critical: {
            standard: "A fault-finding stance — quick to notice and call out what's wrong.",
            simplified: "Feeling like you keep seeing what's wrong with things or people.",
        },
        Disapproving: {
            standard:
                'A cool "I don\'t accept this" reaction to something that clashes with your values.',
            simplified: 'Feeling like something someone did was wrong.',
        },
        Disappointed: {
            standard: "The soft ache when hopes or expectations don't get met.",
            simplified: "Feeling let down when things didn't go how you wanted.",
        },
        Awful: {
            standard: 'A heavy, dreadful "this is really bad" feeling that weighs on you.',
            simplified: 'Feeling really bad about something terrible.',
        },
        Repelled: {
            standard:
                'A strong pull to back away from something you find off-putting or repugnant.',
            simplified: 'Wanting to get away from something that feels gross or wrong.',
        },
        Hurt: {
            standard: 'Emotional pain from feeling wounded, slighted, or uncared-for.',
            simplified: 'Feeling pain inside when someone was unkind or something wounded you.',
        },
        Depressed: {
            standard: 'A flattened, heavy, low state with little energy, joy, or hope.',
            simplified: "Feeling low, heavy, and tired for a long time, like nothing's fun.",
        },
        Guilty: {
            standard:
                'The uncomfortable tug of "I did something wrong" — usually about an action you took.',
            simplified: 'Feeling bad because you think you did something wrong.',
        },
        Despair: {
            standard: "The bleak sense that things can't get better, as if hope has drained away.",
            simplified: "Feeling like nothing will get better and there's no hope.",
        },
        Vulnerable: {
            standard:
                'The tender, unguarded feeling of being open to being hurt — which can also mean openness, not just weakness.',
            simplified: 'Feeling open and easy to hurt right now.',
        },
        Lonely: {
            standard: 'The ache of feeling unconnected or unseen, even when others are around.',
            simplified: 'Feeling alone and wishing you felt closer to someone.',
        },
        Playful: {
            standard:
                'Light, spontaneous, and ready to have fun without taking things too seriously.',
            simplified: 'Feeling fun, silly, and ready to play.',
        },
        Content: {
            standard:
                'A quiet, satisfied ease — a sense of "enough," at peace with how things are.',
            simplified: 'Feeling calm and okay with how things are right now.',
        },
        Interested: {
            standard:
                'Leaning-in curiosity — engaged and drawn toward something that matters to you.',
            simplified: 'Feeling curious and pulled toward something.',
        },
        Proud: {
            standard:
                'Warm satisfaction in something you did, grew through, or are — healthy self-regard, not arrogance.',
            simplified: 'Feeling good about something you did or who you are.',
        },
        Accepted: {
            standard: 'The settled sense of belonging — welcomed just as you are.',
            simplified: 'Feeling like others want you around, just as you are.',
        },
        Powerful: {
            standard: 'A grounded sense of capability and agency — you can affect what happens.',
            simplified: 'Feeling strong and able to make things happen.',
        },
        Peaceful: {
            standard: 'Calm, still, and untroubled — nothing pulling at you.',
            simplified: 'Feeling calm and quiet inside.',
        },
        Trusting: {
            standard: 'Feeling safe enough to rely on and open up to someone.',
            simplified: 'Feeling safe that someone will be good to you.',
        },
        Optimistic: {
            standard: 'A hopeful, forward-leaning sense that good things are ahead.',
            simplified: 'Feeling like good things are coming.',
        },
        Startled: {
            standard: 'A quick, reflexive jump at something sudden — the flinch of surprise.',
            simplified: 'Jumping in surprise when something happens fast.',
        },
        Confused: {
            standard:
                "Foggy and uncertain — things don't add up and you're not sure what to think.",
            simplified: "Feeling mixed up and unsure what's going on.",
        },
        Amazed: {
            standard: 'Wide-eyed wonder at something remarkable — surprise tipped bright.',
            simplified: 'Feeling wowed by something amazing.',
        },
        Excited: {
            standard: "Buzzy, energized anticipation — eager and lit up for what's coming.",
            simplified: 'Feeling happy and full of energy about something ahead.',
        },
        Bored: {
            standard: 'A restless, understimulated flatness — nothing quite engages you.',
            simplified: 'Feeling like nothing is fun or interesting to do.',
        },
        Busy: {
            standard: 'Feeling stretched by having a lot on — pulled in many directions at once.',
            simplified: 'Feeling like you have too much to do and not enough time.',
        },
        Stressed: {
            standard:
                'Tense, pressured, and stretched thin — more is on you than you feel able to handle.',
            simplified: 'Feeling tight and pressured by too much at once.',
        },
        Tired: {
            standard: 'Worn down and low on energy or reserves, needing rest.',
            simplified: 'Feeling worn out and needing rest.',
        },
        Scared: {
            standard: 'Afraid in the moment — bracing against something that feels dangerous.',
            simplified: 'Feeling afraid that something bad will happen.',
        },
        Anxious: {
            standard:
                'Keyed-up unease about something that might go wrong — focused on the future.',
            simplified: 'Feeling worried and on edge about what might happen.',
        },
        Insecure: {
            standard: 'Shaky and unsure of yourself or where you stand.',
            simplified: 'Feeling unsure about yourself.',
        },
        Weak: {
            standard: 'Feeling without the strength or capacity to cope right now.',
            simplified: "Feeling like you don't have the strength to handle things.",
        },
        Rejected: {
            standard: 'The sting of being pushed away or not wanted.',
            simplified: "Feeling hurt because someone didn't want you.",
        },
        Threatened: {
            standard:
                'On guard — sensing something endangers your safety, standing, or sense of self.',
            simplified: 'Feeling like something could hurt you or what matters to you.',
        },

        // TERTIARY
        Betrayed: {
            standard: 'The deep wound of trust broken by someone you relied on.',
            simplified: 'Feeling hurt because someone you trusted let you down badly.',
        },
        Resentful: {
            standard: 'Simmering, held-onto anger at a wrong that still feels unfair.',
            simplified: 'Staying angry at someone for hurting you.',
        },
        Disrespected: {
            standard: 'Feeling treated as unimportant or beneath consideration.',
            simplified: "Feeling like someone treated you as if you don't matter.",
        },
        Ridiculed: {
            standard: 'The hurt of being mocked or laughed at.',
            simplified: 'Feeling hurt because people made fun of you.',
        },
        Indignant: {
            standard: 'Righteous anger at something you find unjust or beneath you.',
            simplified: 'Feeling angry because something is unfair or wrong.',
        },
        Violated: {
            standard: 'The shaken feeling of having your boundaries, body, or rights crossed.',
            simplified: 'Feeling shaken because someone crossed a line with you.',
        },
        Furious: {
            standard: "Intense, blazing anger, near the top of anger's range.",
            simplified: 'Feeling so angry you could burst.',
        },
        Jealous: {
            standard: 'The uneasy fear of losing someone or something you value to a rival.',
            simplified: 'Feeling afraid of losing someone or something you care about.',
        },
        Provoked: {
            standard: 'Stirred toward anger — poked or baited into reacting.',
            simplified: 'Feeling pushed into anger by something someone did.',
        },
        Hostile: {
            standard: 'Cold, combative antagonism — braced against someone.',
            simplified: 'Feeling cold and ready to fight against someone.',
        },
        Infuriated: {
            standard: 'Made intensely angry — pushed past your limit into rage.',
            simplified: 'Feeling driven past your limit into anger.',
        },
        Annoyed: {
            standard: 'Mild, low-grade irritation at something that grates.',
            simplified: 'Feeling a little bugged or bothered.',
        },
        Withdrawn: {
            standard: 'Pulled inward and away — quietly retreating from contact.',
            simplified: 'Pulling away from people and keeping to yourself.',
        },
        Numb: {
            standard: 'Emotionally blank or frozen — feeling little at all, often as protection.',
            simplified: 'Feeling nothing, like your feelings switched off.',
        },
        Skeptical: {
            standard: 'Doubting — not ready to believe or trust just yet.',
            simplified: 'Feeling unsure and not ready to believe it.',
        },
        Dismissive: {
            standard: 'Waving something or someone off as not worth your attention.',
            simplified: "Feeling like something or someone isn't worth your time.",
        },
        Judgmental: {
            standard: 'Quick to size things up and find fault.',
            simplified: "Feeling quick to decide what's wrong with something.",
        },
        Embarrassed: {
            standard: 'Self-conscious discomfort at feeling awkward or on show.',
            simplified: 'Feeling awkward and shy about being noticed.',
        },
        Appalled: {
            standard: 'Shocked dismay at something you find deeply wrong.',
            simplified: 'Feeling shocked because something is so wrong.',
        },
        Revolted: {
            standard: 'Powerful disgust — a whole-body "no."',
            simplified: 'Feeling a strong "no" to something disgusting.',
        },
        Nauseated: {
            standard: 'Disgust so strong it turns your stomach.',
            simplified: 'Feeling sick inside because something is so gross or wrong.',
        },
        Detestable: {
            standard: 'Finding something or someone loathsome — worthy of your contempt.',
            simplified: 'Feeling like something or someone is truly hateful.',
        },
        Horrified: {
            standard: 'Shocked and dismayed by something dreadful.',
            simplified: 'Feeling shocked and scared by something awful.',
        },
        Hesitant: {
            standard: 'Holding back — unsure whether to act or trust.',
            simplified: 'Feeling unsure and holding back.',
        },
        Inferior: {
            standard: 'Feeling lesser — not as good, worthy, or capable as others.',
            simplified: "Feeling like you're not as good as other people.",
        },
        Empty: {
            standard: 'A hollow, void feeling, as if something inside is missing.',
            simplified: "Feeling hollow inside, like something's missing.",
        },
        Remorseful: {
            standard:
                "Painful regret for something you did and wish you hadn't, with a pull to make it right.",
            simplified: 'Feeling sorry for something you did and wanting to fix it.',
        },
        Ashamed: {
            standard: 'The painful sense that *you yourself* are flawed or not enough.',
            simplified: 'Feeling like something is wrong with who you are.',
        },
        Powerless: {
            standard: "Feeling unable to change or affect what's happening.",
            simplified: "Feeling like you can't change what's happening.",
        },
        Grief: {
            standard: 'The deep sorrow of a real loss — love with nowhere to go.',
            simplified: 'Feeling deep sadness because someone or something is gone.',
        },
        Fragile: {
            standard: 'Feeling delicate and easily broken — handle with care.',
            simplified: 'Feeling delicate, like you could break easily.',
        },
        Victimized: {
            standard: "Feeling wronged and harmed by someone else's actions.",
            simplified: 'Feeling hurt and wronged by what someone did.',
        },
        Abandoned: {
            standard: 'The painful sense of being left alone by those meant to stay.',
            simplified: 'Feeling alone because someone important left you.',
        },
        Isolated: {
            standard: 'Cut off and alone — separated from others.',
            simplified: 'Feeling cut off and far from everyone.',
        },
        Aroused: {
            standard:
                'Emotionally stirred and awakened — your energy switched on, lively and engaged.',
            simplified: 'Feeling stirred up and full of lively energy.',
        },
        Cheeky: {
            standard: 'Playfully bold and a little impudent — teasing in good fun.',
            simplified: 'Feeling playfully bold and a bit mischievous.',
        },
        Free: {
            standard: 'Unburdened and at liberty — light, with nothing holding you back.',
            simplified: 'Feeling light and free, with nothing holding you down.',
        },
        Joyful: {
            standard: 'Bright, full-hearted delight and gladness — the peak of happiness.',
            simplified: 'Feeling so glad and light you could celebrate.',
        },
        Curious: {
            standard: 'Drawn to explore and learn — eager to know more.',
            simplified: 'Feeling eager to find out more.',
        },
        Inquisitive: {
            standard: 'Actively questioning and probing — wanting to really understand.',
            simplified: 'Feeling full of questions and wanting to understand.',
        },
        Successful: {
            standard: 'The satisfied sense of having achieved or accomplished something.',
            simplified: 'Feeling good because you reached a goal.',
        },
        Confident: {
            standard: 'Sure of yourself and your abilities — trusting you can handle it.',
            simplified: 'Feeling sure you can do it.',
        },
        Respected: {
            standard: 'Feeling regarded, valued, and taken seriously by others.',
            simplified: 'Feeling like others take you seriously.',
        },
        Valued: {
            standard: 'Feeling that you matter and are appreciated.',
            simplified: 'Feeling like you matter to others.',
        },
        Courageous: {
            standard: "Brave in the face of fear — acting even though you're afraid.",
            simplified: 'Feeling brave enough to face something scary.',
        },
        Creative: {
            standard: 'Lit up to make, imagine, and bring something new into being.',
            simplified: 'Feeling full of ideas and ready to make something.',
        },
        Loving: {
            standard: 'A warm, tender, caring feeling toward someone.',
            simplified: 'Feeling warm and caring toward someone.',
        },
        Thankful: {
            standard: "Warm appreciation for something good you've received.",
            simplified: 'Feeling grateful for something good.',
        },
        Sensitive: {
            standard:
                'Feeling things deeply and finely attuned to emotion — attunement, not "too much."',
            simplified: 'Feeling things deeply and noticing feelings easily.',
        },
        Intimate: {
            standard: 'Feeling close and deeply connected with someone who truly knows you.',
            simplified: 'Feeling close and truly known by someone.',
        },
        Hopeful: {
            standard: 'Trusting that good is possible and reaching toward it.',
            simplified: 'Feeling like good things can happen.',
        },
        Inspired: {
            standard: 'Lit up and moved to create, act, or grow.',
            simplified: 'Feeling moved and ready to create or do something.',
        },
        Shocked: {
            standard: 'Jolted and stunned by something sudden and big.',
            simplified: 'Feeling stunned by something big and sudden.',
        },
        Dismayed: {
            standard: 'Discouraged and troubled by an unwelcome turn of events.',
            simplified: 'Feeling upset and discouraged by bad news.',
        },
        Disillusioned: {
            standard: 'The ache of losing a belief or ideal you held as a rosy hope falls away.',
            simplified: "Feeling let down after learning something wasn't what you believed.",
        },
        Perplexed: {
            standard: 'Puzzled and unable to make sense of something.',
            simplified: 'Feeling puzzled and unable to figure it out.',
        },
        Astonished: {
            standard: 'Struck with wonder or disbelief at something remarkable.',
            simplified: 'Feeling amazed and hardly able to believe it.',
        },
        Awed: {
            standard: 'Humbled wonder before something vast or magnificent.',
            simplified: 'Feeling small and full of wonder at something huge.',
        },
        Eager: {
            standard: 'Keenly ready and impatient to begin.',
            simplified: "Feeling ready and can't wait to start.",
        },
        Energetic: {
            standard: 'Full of vitality and get-up-and-go.',
            simplified: 'Feeling full of energy and ready to go.',
        },
        Indifferent: {
            standard: "Uninterested and unmoved — it just doesn't touch you.",
            simplified: "Feeling like you don't care either way.",
        },
        Apathetic: {
            standard: 'A flat lack of motivation or care about much of anything.',
            simplified: "Feeling like you can't bring yourself to care.",
        },
        Pressured: {
            standard: 'Feeling pushed to perform or decide by demands on you.',
            simplified: 'Feeling pushed to do or decide something.',
        },
        Rushed: {
            standard: "Hurried — not enough time for what's being asked of you.",
            simplified: "Feeling like there's not enough time.",
        },
        Overwhelmed: {
            standard: 'Swamped — more is coming at you than you can process or manage.',
            simplified: 'Feeling like everything is too much to handle.',
        },
        'Out of Control': {
            standard: "The feeling that you've lost your grip on a situation or on yourself.",
            simplified: "Feeling like things are spinning and you can't hold on.",
        },
        Sleepy: {
            standard: 'Drowsy and low-energy — your body asking for rest.',
            simplified: 'Feeling drowsy and ready for sleep.',
        },
        Unfocused: {
            standard: 'Scattered — unable to gather your attention.',
            simplified: 'Feeling scattered and unable to concentrate.',
        },
        Helpless: {
            standard: 'Feeling unable to help yourself or change things.',
            simplified: "Feeling like you can't do anything to help yourself.",
        },
        Frightened: {
            standard: 'Sharply afraid — fear hitting you in the moment.',
            simplified: 'Feeling suddenly and strongly afraid.',
        },
        Worried: {
            standard: 'Uneasy, looping thoughts about what might go wrong.',
            simplified: 'Feeling uneasy and stuck on what might go wrong.',
        },
        Inadequate: {
            standard: "Feeling not enough — not quite up to what's needed.",
            simplified: "Feeling like you're not good enough for what's needed.",
        },
        Worthless: {
            standard: 'The painful belief that you have no value — a shame signal, not a truth.',
            simplified: "Feeling like you don't matter at all.",
        },
        Insignificant: {
            standard: 'Feeling small, overlooked, and unimportant.',
            simplified: 'Feeling small and easy to overlook.',
        },
        Excluded: {
            standard: 'Left out — kept on the outside of a group or bond.',
            simplified: 'Feeling left out of the group.',
        },
        Persecuted: {
            standard: 'Feeling singled out and targeted for harm or blame.',
            simplified: 'Feeling picked on and targeted.',
        },
        Nervous: {
            standard: 'Jittery, on-edge unease before something uncertain.',
            simplified: "Feeling jittery and on edge about what's ahead.",
        },
        Exposed: {
            standard: 'Uncomfortably open to view, with nowhere to hide.',
            simplified: 'Feeling open and seen, with nowhere to hide.',
        },
    },
};
