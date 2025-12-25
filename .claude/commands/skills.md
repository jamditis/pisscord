# Pisscord Skills Index

Overview of available Claude Code skills for Pisscord development. Each skill encodes expert knowledge about specific aspects of the codebase.

## Available Skills

### `/release` - Release Management
**Triggers:** "release", "new version", "ship", "deploy", version numbers

Automates the 13-step release workflow:
- Version bumping across 5 files
- Release notes generation
- Multi-platform builds
- Git tagging and GitHub release creation
- Firebase configuration updates

### `/component` - Component Development
**Triggers:** "create component", "add modal", "build panel", UI features

Scaffolds new components following Pisscord patterns:
- Dual mobile/desktop layouts
- Theme integration with `useTheme()`
- Framer Motion animations
- TypeScript interfaces
- Integration with `App.tsx` state

### `/webrtc-debug` - WebRTC Diagnostics
**Triggers:** "can't connect", "no audio", "no video", "call dropping", WebRTC errors

Debug P2P voice/video connections:
- 5-layer diagnostic framework
- ICE/STUN troubleshooting
- Stale closure pattern detection
- Network requirements
- Common fix procedures

### `/firebase-ops` - Firebase Operations
**Triggers:** "update Pissbot", "release notes", "Firebase", database operations

Manage Firebase Realtime Database:
- Pissbot AI configuration
- Release notes updates
- System settings
- Data structure documentation
- Script execution

### `/build` - Multi-Platform Build
**Triggers:** "build", "compile", "package", platform names

Orchestrate builds across platforms:
- Desktop (Electron) → `.exe` installer
- Web → Static `dist-web/`
- Android (Capacitor) → `.apk`
- Build verification checklists
- Common issue resolution

## Skill Design Principles

These skills follow the **4 Core Truths**:

1. **Expertise Transfer, Not Instructions**
   - Skills encode *how to think* about problems
   - Mental models explain *why*, not just *what*
   - Decision frameworks for ambiguous situations

2. **Flow, Not Friction**
   - Direct output production
   - No intermediate planning documents
   - Actionable commands and code

3. **Voice Matches Domain**
   - Uses Pisscord-specific terminology
   - References actual file paths and functions
   - Speaks like a codebase expert

4. **Focused Beats Comprehensive**
   - Each skill has a single responsibility
   - Deep expertise in narrow domain
   - Cross-references other skills when needed

## Adding New Skills

To create a new skill:

1. Create `.claude/commands/your-skill.md`
2. Follow this structure:
   ```markdown
   # Skill Name

   Brief description of what this skill does.

   ## When to Activate
   - Trigger phrases and conditions

   ## Mental Model
   How to think about this domain.

   ## Detailed Guidance
   Step-by-step procedures.

   ## Common Issues
   Troubleshooting reference.

   ## Example Usage
   Concrete examples.
   ```

3. Add entry to this index file
4. Test skill activation with trigger phrases

## Skill Interaction

Skills can reference each other:

- **Release** → uses **Build** for compilation
- **Component** → follows patterns documented in **Firebase Ops** for service functions
- **WebRTC Debug** → may require **Build** for testing fixes
- **Firebase Ops** → referenced by **Release** for post-release updates

## Usage Tips

1. **Invoke directly:** Use `/release 1.5.2` or `/build web`
2. **Natural language:** "Help me create a new settings panel" activates `/component`
3. **Combine skills:** "Release 1.5.2 with web deployment" uses both `/release` and `/build`
4. **Ask for help:** "What skills are available?" returns this index

---
Created: 2025-12-25
Version: 1.0
