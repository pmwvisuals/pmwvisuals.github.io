// Editorial selections are explained by visual/screen-fit criteria, never popularity.
export const reviewed = {
  'wallpapers/amoled/01/blue-comet-streaking-through-darkness.html': {
    intro: 'An electric-blue comet crosses a nearly black field on a steep diagonal. The bright head sits toward the lower left, with a fine trail reaching into the upper right.',
    note: 'The open black corners give this composition room to breathe. Try a lock-screen clock in the upper left; check that widgets do not cover the comet trail.',
    mood: 'High contrast, spare, energetic',
    reason: 'A single bright subject with open dark corners.'
  },
  'wallpapers/amoled/02/black-marble-with-gold-cracks.html': {
    intro: 'Fine gold veins cut across a black marble-like surface. The strongest warm streak runs diagonally through the middle, while the surrounding texture stays subdued.',
    note: 'This is a useful home-screen starting point: there is no face or large central subject to hide behind icons. Use light labels and check them against the brighter gold veins.',
    mood: 'Textured, restrained, warm accents',
    reason: 'Subtle texture for a less busy home screen.'
  },
  'wallpapers/dark-fantasy/01/blue-mushroom-forest-under-the-moon.html': {
    title: 'Moonlit Blue Bioluminescent Forest',
    intro: 'Floating jellyfish-like forms illuminate a dense forest in blue. A moon above the canopy and a winding stream below connect the upper and lower parts of the scene.',
    note: 'Keep the full height on a lock screen to retain both the moon and the stream. The glowing forms make the middle busy, so a sparse widget layout lets the scene remain legible.',
    mood: 'Otherworldly, luminous, nocturnal',
    reason: 'A full-height fantasy scene with light at several depths.'
  },
  'wallpapers/nature/01/sunlit-forest-creek.html': {
    title: 'Sunlit Alpine Creek',
    intro: 'A rocky creek leads through a sunlit green valley toward sharp, snow-covered mountain peaks. Blue sky and small clouds occupy the upper part of this alpine-style digital scene.',
    note: 'The creek acts as a visual path from the foreground to the peaks. A tall crop keeps that progression; a square crop will lose some sky or foreground. Preview the crop before setting it.',
    mood: 'Open, bright, green and blue',
    reason: 'A clear foreground-to-background path to compare crops.'
  },
  'wallpapers/romantic/01/gondola-in-a-moonlit-canal.html': {
    intro: 'A gondola fills the foreground of a narrow canal, facing a small bridge. Amber windows and lanterns reflect in the water beneath a blue night sky and full moon.',
    note: 'The canal leads the eye upward from the boat to the bridge. Preserve the central axis on a lock screen. For a home screen, try fewer icons so the reflections and lamps are not obscured.',
    mood: 'Intimate, cinematic, warm light against cool night',
    reason: 'Warm lantern reflections paired with a cool night sky.'
  },
  'wallpapers/space-and-galaxy/01/red-sun-and-orbiting-planets.html': {
    intro: 'A fiery orange-red star dominates the upper half, surrounded by small dark worlds. Larger planets in the foreground add depth to this imagined planetary scene.',
    note: 'Place clock text away from the brightest part of the star. The lower dark planets offer a different contrast zone, but test your own labels against their illuminated edges.',
    mood: 'Dramatic, fiery, cosmic',
    reason: 'A bold central light source with darker foreground planets.'
  },
  'wallpapers/anime/01/boy-in-a-blue-crystal-cave-city.html': {
    intro: 'A cloaked young figure carrying a lantern overlooks a cavern city. Blue crystal light fills the surrounding rock, with smaller amber lamps marking buildings below.',
    note: 'The figure sits toward the lower left and the city recedes into the center. A lock screen with limited notifications preserves that scale; heavy icon rows will hide the small buildings.',
    mood: 'Exploration, cool light, illustrated fantasy',
    reason: 'A small figure establishes the scale of the cavern.'
  },
  'wallpapers/dark-aesthetic/01/candlelit-library-shelves.html': {
    intro: 'An open book rests on a heavy desk in a shadowed, multi-level library. Amber lamps pick out shelves and railings while most of the room stays dark.',
    note: 'The desk occupies the lower foreground. Let a lock-screen clock sit above it, and check that notification cards do not cover the book. Light labels suit the darker parts of the room.',
    mood: 'Quiet, enclosed, amber-lit',
    reason: 'Warm interior light with deep shadows.'
  },
  'wallpapers/celestial-samurai/01/samurai-entering-lantern-village-at-night.html': {
    intro: 'A lone robed figure looks down a stone path into a lantern-lit hillside village. Warm windows and lamps lead toward a distant tower under a cool, clouded sky.',
    note: 'A central crop keeps the figure and path together. Leave the lower center clear if the figure is the part you want to see; use the sky as a starting area for clock placement.',
    mood: 'Solitary, contemplative, lantern-lit',
    reason: 'A clear path and warm/cool contrast.'
  },
  'wallpapers/desktop/abstract/velvet-waves-in-jewel-tones.html': {
    intro: 'Soft folded waves layer gold, teal, violet and deep blue across a wide frame. Light catches the ridges while the troughs remain dark, suggesting a velvet-like surface.',
    note: 'The sweeping bands suit a landscape desktop without a single subject that must stay centered. Try icons over the darker blue or violet areas; bright gold folds can reduce label contrast.',
    mood: 'Tactile, flowing, jewel-toned',
    colors: [['Deep blue','#14223f'],['Teal','#175455'],['Violet','#463154'],['Gold','#b89943']],
    reason: 'Wide color bands for comparing desktop icon placement.'
  }
};

export const collections = [
  {
    slug:'amoled', name:'AMOLED wallpapers', family:'contrast', label:'Light against darkness',
    intro:'A small pool of light can change the whole screen. This collection brings together black backgrounds, luminous objects and fine dark textures, from a lone comet to gold-veined stone.',
    description:'Explore black-background and glowing AMOLED artwork, compare visual styles, and learn how to choose a readable phone wallpaper.',
    hero:'wallpapers/amoled/01/blue-comet-streaking-through-darkness.html',
    themes:[['Isolated light','A comet, moon or feather can leave more of the screen visually quiet. Compare the empty areas with your clock and icon positions.','comet|crescent|feather'],['Neon creatures','Animal portraits and luminous wings create a strong focal point. Give faces and eyes room rather than placing labels over them.','portrait|eye|lion|wing'],['Dark textures','Marble, fluid forms and fine gold lines offer a patterned background without a large character. Watch the bright veins behind small text.','marble|liquid|gold cracks']],
    fit:'A dark image is not automatically pure black. OLED pixels can emit less light in dark areas, but the result depends on the actual pixels, brightness and device. Choose the picture for readability first; this collection does not promise a measured battery saving.',
    use:'Minimal layouts suit the isolated objects; richer portraits work better as lock screens. Gold and amber accents feel warmer than blue neon, even against a similar black ground.',
    faq:[['Does AMOLED mean a special file type?','No. It describes a screen technology and, here, a dark visual style. These downloads use ordinary image formats listed on each detail page.'],['Will these fill a tall phone screen?','The portrait files are close to 9:16. Taller phones may crop the sides when set to fill. Check the focal point in the device preview.']],
    related:['dark-aesthetic','space-and-galaxy']
  },
  {
    slug:'dark-fantasy',name:'Dark fantasy wallpapers',family:'cinematic',label:'Scenes beyond the familiar',
    intro:'Glowing forests, strange architecture and creatures share this collection with shadowed landscapes. Choose a scene by its focal point and lighting, then decide how much of its story you want visible behind your screen layout.',
    description:'Browse imagined forests, portals and mythical scenes with practical crop and screen-layout guidance for dark fantasy phone wallpapers.',
    hero:'wallpapers/dark-fantasy/01/blue-mushroom-forest-under-the-moon.html',
    themes:[['Luminous worlds','Forests, crystals and lantern paths draw attention with small points of light. Sparse widgets preserve their depth.','forest|crystal|lantern'],['Portals and architecture','Doors, castles and stairways give the frame a direction. Check what a crop removes from the entrance or skyline.','portal|castle|stair'],['Creatures and silhouettes','A dragon or lone figure can dominate the frame. Keep key outlines away from notification cards.','dragon|figure|creature']],
    fit:'Most images here are portrait artwork, not widescreen scenes. A phone lock screen can show more of the composition than a crowded home screen. For a monitor, compare the separate landscape fantasy results rather than stretching a portrait.',
    use:'Blue and violet lighting suggests a cooler atmosphere; fire and lanterns bring warm contrast. These are imagined scenes, so titles should not be treated as real locations or named fictional franchises.',
    faq:[['Is this a collection of film or game screenshots?','The collection presents digital fantasy artwork. A familiar visual mood does not establish a connection to a named game, film or character.'],['How do I keep a dramatic scene readable?','Use a limited widget layout and place text over calmer areas. Busy highlights can compete with small labels.']],
    related:['celestial-samurai','space-and-galaxy']
  },
  {
    slug:'nature',name:'Nature wallpapers',family:'landscape',label:'Room to look further',
    intro:'Follow a creek into a valley, look across a lake, or choose the rhythm of a forest path. The nature collection uses landscape-inspired digital imagery, with different balances of open sky, textured foliage and water.',
    description:'Compare nature-inspired valleys, water, forests and skies, with framing and resolution guidance for portrait wallpaper artwork.',
    hero:'wallpapers/nature/01/sunlit-forest-creek.html',
    themes:[['Mountains and valleys','Peaks work as a distant anchor; rivers and paths connect the foreground to them. Preserve that depth when cropping.','mountain|valley|alpine'],['Water and reflections','A lake can create a quieter area, while waterfalls and surf are more textured. Pick the balance that suits your icons.','lake|waterfall|ocean'],['Forests and seasons','Leaves, mist and snow change both color and texture. Denser foliage usually needs more careful label placement.','forest|autumn|snow']],
    fit:'A landscape subject can still be in a portrait file. Read the actual width and height on the detail page rather than assuming that every nature scene is suitable for a desktop. Crop gently so the horizon and foreground still relate.',
    use:'Greens and blues can coordinate with simple icon themes. Sunrise and autumn scenes offer warmer alternatives. Scene names describe artwork, not verified photographic locations.',
    faq:[['Are these photographs of real places?','The collection is landscape-inspired digital artwork. Do not use a title as evidence of a real place or a photographic capture.'],['Should I stretch a portrait across a monitor?','Stretching changes the shapes. Use a matching landscape file, or crop with a preview and accept that some of the image will be lost.']],
    related:['romantic','dark-aesthetic']
  },
  {
    slug:'romantic',name:'Romantic wallpapers',family:'scenic',label:'Warm light, quiet moments',
    intro:'Moonlit canals, flower gardens and scenes with couples offer different kinds of intimacy. Some focus on a person or shared moment; others use lanterns, reflections and soft skies to carry the mood.',
    description:'Explore romantic digital scenes, from lantern-lit canals to gardens and couples, with color and lock-screen framing notes.',
    hero:'wallpapers/romantic/01/gondola-in-a-moonlit-canal.html',
    themes:[['Lanterns and night water','Warm lamps against cool night skies create contrast. Keep reflected light visible if it is the part you like most.','lantern|canal|moonlit'],['Gardens and blossoms','Floral scenes vary from open fields to detailed arches. A simple icon layout leaves more of the petals visible.','flower|blossom|garden'],['Couples and shared moments','People give the scene a focal point. Preview where clocks and notifications fall before choosing a crop.','couple|wedding|bride']],
    fit:'Use a lock screen when the scene depends on a couple, boat or central path. For a home screen, look for a less detailed sky or water area. An image can be romantic without using pink as its main color.',
    use:'Amber and navy create an evening mood; lavender, rose and pale skies feel softer. Match a second wallpaper by light and color rather than assuming that any two images form a designed pair.',
    faq:[['Can I use the same picture on both screens?','Yes, but check each preview separately. A clock and an icon grid cover different parts of the image.'],['Are matching pairs supplied?','No paired set is implied. Use the related scene links to compare colors and choose your own combination.']],
    related:['nature','dark-aesthetic']
  },
  {
    slug:'space-and-galaxy',name:'Space and galaxy wallpapers',family:'cosmic',label:'Imagined skies and distant light',
    intro:'Bright stars, ringed planets and swirls of nebula color provide a range of cosmic compositions. Compare a single clear shape with a sky full of detail before deciding what belongs behind your clock.',
    description:'Browse space-inspired digital art and compare planets, nebulae and dark skies with practical screen-contrast guidance.',
    hero:'wallpapers/space-and-galaxy/01/red-sun-and-orbiting-planets.html',
    themes:[['Planets and rings','Strong circular forms give the screen a focal point. Keep rings and illuminated edges inside the crop.','planet|ring|moon'],['Nebula color','Clouds of color can carry a theme without a single character. Check whether bright patches compete with labels.','nebula|galaxy|cosmic'],['Exploration scenes','Astronauts, observatories and imagined structures add scale. These scenes are artwork rather than astronomical records.','astronaut|observatory|rover']],
    fit:'A dark sky is useful only if text stays readable where it actually lands. Bright stars and rims can reduce contrast in otherwise dark images. Portrait and landscape files should be selected by dimensions, not by the subject.',
    use:'Red and orange stars feel warmer than blue nebulae. The colors and planetary arrangements in these digital scenes should not be interpreted as scientific measurements or real telescope observations.',
    faq:[['Are these scientifically accurate space photographs?','No scientific accuracy or photographic origin is claimed. Treat them as space-inspired digital artwork.'],['Can I get a 4K image by resizing one of these?','Resizing can make a larger file but cannot recover missing detail. Compare the original dimensions with your display first.']],
    related:['amoled','dark-fantasy']
  },
  {
    slug:'anime',name:'Anime-style wallpapers',family:'illustration',label:'A figure within a world',
    intro:'Characters and environments work together in these illustrated scenes. A small figure can make a cavern feel vast, while a closer portrait brings expression to the foreground. Choose the scale that suits your screen.',
    description:'Explore anime-style digital scenes and character artwork with focal-point, crop and phone-layout guidance.',
    hero:'wallpapers/anime/01/boy-in-a-blue-crystal-cave-city.html',
    themes:[['Exploration and scale','Caverns, rooftops and distant worlds use a figure to establish scale. Try a full-height lock screen to retain the setting.','cave|city|island'],['Everyday scenes','Rooms, streets and gardens offer a more familiar setting. Keep key gestures visible when notifications appear.','room|street|garden'],['Light and atmosphere','Crystals, sunset and night lighting can connect two different illustrations through color.','crystal|sunset|night']],
    fit:'Keep the face or silhouette outside your clock and widget zones. A landscape illustration may suit a desktop, while these portrait scenes often work better on a lock screen. Read the orientation on each detail page.',
    use:'Blue crystal light, warm lamps and sunset palettes offer different themes. The category describes an illustration style; it does not identify a licensed series or a named character.',
    faq:[['Are these official anime-series images?','The category indicates a visual style. No official series, studio affiliation or named character is implied by the artwork.'],['Why does my phone hide part of the character?','Its screen ratio and wallpaper fill setting may crop the image. Adjust the positioning in your device preview.']],
    related:['celestial-samurai','dark-fantasy']
  },
  {
    slug:'dark-aesthetic',name:'Dark aesthetic wallpapers',family:'atmosphere',label:'Texture, shadow and a quieter pace',
    intro:'Shadowed libraries, rain-soaked streets and nocturnal scenery make darkness feel textured rather than empty. Start with the kind of space you want: enclosed and warm, open and moonlit, or graphic and minimal.',
    description:'Browse shadowed interiors, night scenery and textured digital art with guidance for choosing a readable dark aesthetic wallpaper.',
    hero:'wallpapers/dark-aesthetic/01/candlelit-library-shelves.html',
    themes:[['Warm interiors','Books, candles and lamps create small areas of warmth. Check the contrast of text against both the dark room and the lamp highlights.','library|candle|room'],['Night paths and cities','Wet streets and distant windows create depth. A central path often benefits from fewer foreground widgets.','street|path|city'],['Moonlight and silhouettes','Choose strong outlines for a calmer screen. Dark scenery does not necessarily contain pure black pixels.','moon|silhouette|night']],
    fit:'Dark palettes can still be visually busy. Use a sparse home-screen layout for detailed interiors, or let the full scene show on the lock screen. Check your labels in the actual bright and dark areas.',
    use:'Amber interiors pair well with warm icon accents; moonlit scenes often lean cooler. If you want less detail, compare the AMOLED collection rather than simply turning down screen brightness.',
    faq:[['How is this different from AMOLED artwork?','This collection emphasizes mood and texture. AMOLED-style selections more often use isolated light against a black or nearly black field.'],['Should I darken the image myself?','Try the existing preview first. Excessive darkening can remove the very texture that makes the scene useful.']],
    related:['amoled','romantic']
  },
  {
    slug:'celestial-samurai',name:'Celestial samurai wallpapers',family:'cinematic',label:'A lone figure, a larger journey',
    intro:'Robed figures, lantern villages and imagined celestial settings form this collection. The figure often supplies scale while a path, gate or distant light gives the scene its direction.',
    description:'Explore samurai-inspired digital scenes, lantern paths and cosmic settings with crop and lock-screen composition notes.',
    hero:'wallpapers/celestial-samurai/01/samurai-entering-lantern-village-at-night.html',
    themes:[['Lantern paths','Warm lights help trace a route through a dark scene. Keep the figure and the route within the same crop.','lantern|village|path'],['Gates and temples','Architecture frames an entrance or destination. Check the top and sides before choosing a fill setting.','gate|temple|torii'],['Cosmic journeys','Moons, stars and imagined skies place the figure in a larger world. Preserve the scale rather than zooming in too far.','moon|galaxy|star']],
    fit:'The central figure and path usually need a clear vertical area. A lock screen with a small clock is a useful starting arrangement. Preview notifications before committing to the image.',
    use:'Lantern scenes mix warm light with cool sky; cosmic scenes often add violet or blue. These are stylized digital settings, not documentation of historical armor, places or events.',
    faq:[['Are the scenes historically accurate?','No historical accuracy is asserted. The collection uses samurai-inspired figures within stylized and imagined settings.'],['Where should I put the clock?','Use a quiet part of the sky as a starting point, then check it on your phone; each image places its brightest areas differently.']],
    related:['anime','dark-fantasy']
  }
];

export const collectionFor = (slug) => collections.find(c => c.slug === slug);
export const PILOT_PATHS = Object.keys(reviewed);
