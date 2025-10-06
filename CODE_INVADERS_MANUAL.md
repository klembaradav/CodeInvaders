# Code Invaders - Development Manual

## Game Overview
**Code Invaders** is a retro-style space shooter game inspired by the classic Space Invaders, themed for the Update Conference Prague 2025. The game features pixel-art aesthetics using the official UCP color palette and incorporates programming/coding elements as the core theme.

## Color Palette (UCP Brand Colors)
- **UCP Yellow**: `#FBB13C` - Primary accent color
- **UCP Blue**: `#31B3F2` - Secondary accent color  
- **UCP Pink**: `#F562A5` - Tertiary accent color
- **Background**: Dark/black for pixel-art contrast
- **Text**: White/light colors for readability
- **Pixel Art**: 8x8 or 16x16 pixel sprites

## Core Game Mechanics

### Player (Code Defender)
- **Movement**: Left/Right arrow keys or A/D keys
- **Shooting**: Spacebar or mouse click
- **Appearance**: Pixel-art spaceship (16x16 sprite)
- **Health**: 3 lives
- **Weapon**: Pixel laser beams (yellow/blue)

### Enemies (Code Invaders)
- **Types**: 
  - Basic bugs (pink pixel sprites)
  - Syntax errors (yellow pixel sprites) 
  - Logic errors (blue pixel sprites)
- **Movement**: Descending formation, side-to-side movement
- **Shooting**: Occasional projectiles
- **Points**: Different point values per enemy type
- **Sprites**: 8x8 or 16x16 pixel art

### Power-ups
- **Extra Life**: Pink heart pixel sprite
- **Rapid Fire**: Blue lightning bolt pixel sprite
- **Shield**: Yellow protective barrier pixel sprite
- **Multi-shot**: Triple laser spread
- **Sprites**: 8x8 pixel art for all power-ups

## Technical Requirements

### Core Technologies
- **HTML5 Canvas** for rendering
- **Vanilla JavaScript** (ES6+) - no frameworks
- **CSS3** for styling and animations
- **Web Audio API** for sound effects

### Project Structure
```
CodeInvadersEasy/
├── index.html
├── css/
│   ├── style.css
│   └── neon-effects.css
├── js/
│   ├── game.js
│   ├── player.js
│   ├── enemy.js
│   ├── bullet.js
│   ├── powerup.js
│   └── utils.js
├── assets/
│   ├── sounds/
│   ├── sprites/
│   │   ├── player.png
│   │   ├── enemies/
│   │   ├── powerups/
│   │   └── effects/
│   └── images/
└── README.md
```

## Development Guidelines

### 1. Keep It Simple
- Use basic JavaScript classes and functions
- Avoid complex inheritance patterns
- Focus on core gameplay mechanics first
- Add polish and effects later

### 2. Pixel-Art Aesthetic
- Dark background with bright pixel colors
- Pixel-perfect rendering with no anti-aliasing
- Pixelated fonts (8-bit style)
- Scanline effects for CRT monitor feel
- Pixel-based particle effects for explosions
- 8x8 or 16x16 pixel sprite dimensions
- Limited color palette per sprite

### 3. Performance Considerations
- Use requestAnimationFrame for smooth 60fps
- Object pooling for bullets and enemies
- Limit maximum number of objects on screen
- Optimize collision detection

### 4. Responsive Design
- Canvas should scale to fit screen
- Maintain aspect ratio
- Touch controls for mobile devices
- Keyboard and mouse support

## Game States
1. **Menu**: Start screen with UCP branding
2. **Playing**: Active gameplay
3. **Paused**: Game pause with overlay
4. **Game Over**: Score display and restart option
5. **High Scores**: Leaderboard (local storage)

## Controls
- **Arrow Keys** or **WASD**: Player movement
- **Spacebar** or **Mouse Click**: Shoot
- **P**: Pause/Resume
- **R**: Restart game
- **M**: Toggle sound

## Scoring System
- Basic bugs: 10 points
- Syntax errors: 25 points
- Logic errors: 50 points
- Power-ups: Bonus multipliers
- Combo system for consecutive hits

## Audio Design
- Retro electronic sound effects
- 8-bit style music
- Sound effects for:
  - Player shooting
  - Enemy destruction
  - Power-up collection
  - Game over
  - Background ambient

## Conference Integration
- UCP 2025 branding throughout
- Conference dates and venue info in menu
- Special "Conference Mode" with UCP-themed enemies
- Achievement system for conference milestones

## Development Phases

### Phase 1: Core Mechanics
- [ ] Basic canvas setup
- [ ] Player movement and shooting
- [ ] Enemy spawning and movement
- [ ] Collision detection
- [ ] Basic scoring

### Phase 2: Visual Polish
- [ ] Pixel-art styling and effects
- [ ] Pixel-based particle systems
- [ ] Background pixel animations
- [ ] UI/UX improvements with pixel fonts

### Phase 3: Audio & Polish
- [ ] Sound effects implementation
- [ ] Music integration
- [ ] Performance optimization
- [ ] Mobile responsiveness

### Phase 4: Conference Features
- [ ] UCP branding integration
- [ ] Special conference mode
- [ ] Achievement system
- [ ] Social sharing features

## Code Style Guidelines
- Use meaningful variable and function names
- Comment complex logic
- Keep functions small and focused
- Use consistent indentation (2 spaces)
- Follow ES6+ best practices

## Testing Checklist
- [ ] Game runs smoothly at 60fps
- [ ] All controls work correctly
- [ ] Collision detection is accurate
- [ ] Sound effects play properly
- [ ] Game state transitions work
- [ ] Responsive design works on different screen sizes
- [ ] No memory leaks or performance issues

## Deployment
- Static files only (no server required)
- Can be hosted on GitHub Pages
- Include instructions for local development
- Provide demo link for conference attendees

## Future Enhancements
- Multiplayer mode
- Different difficulty levels
- More enemy types
- Boss battles
- Online leaderboards
- Mobile app version

---

*This manual serves as a comprehensive guide for developing the Code Invaders game for Update Conference Prague 2025. Follow these guidelines to create an engaging, retro-styled game that represents the conference theme while maintaining simplicity and fun gameplay.*
