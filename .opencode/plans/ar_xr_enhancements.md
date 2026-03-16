# AR/XR Enhancement Plan for FabricPet

## Issues Identified
1. Redundant LLM chat feature in AR mode (already exists in dedicated Chat tab)
2. WebXR support detection issues with browsers like Xverse and Chromebook Chrome
3. Lack of pet interaction capabilities in AR/XR modes
4. Battle mechanics not working in XR/AR modes
5. Need to ensure 3D ordinal assets properly replace default pet model
6. Desire for room/fabric swapping based on pet level progression
7. Want fully automatic RP1 sharing without manual publishing
8. Need proper pResource.sReference linking per OMB wiki guidelines

## Planned Enhancements

### 1. Remove Redundant LLM Chat from AR Mode
- Remove LLM chat toggle button and associated logic from ARView.tsx
- Keep the dedicated Chat tab as the sole location for LLM interactions
- Simplify AR mode to focus on visual/spatial experience

### 2. Improve WebXR Support Detection
- Implement more robust WebXR detection that works across browsers
- Add fallback detection mechanisms for browsers with non-standard implementations
- Provide clear UI feedback when WebXR is not available vs when it's available but not granted
- Handle permission prompts gracefully

### 3. Enhance AR Mode with Pet Interaction
- Implement gesture recognition (tap, swipe, pinch) for pet interaction
- Add voice command capabilities using Web Speech API where available
- Create reaction system where pet responds to interactions with animations/sounds
- Add idle behaviors and ambient animations to make pet feel alive

### 4. Enable Battle Mechanics in XR/AR Modes
- Integrate battle system with AR view so users can see battles in their environment
- Implement visual battle effects (particles, damage numbers, etc.) in AR space
- Allow users to initiate battles from AR mode
- Show battle results and pet reactions in real-time

### 5. Ensure 3D Ordinal Asset Replacement
- Verify that when a 3D GLB ordinal is equipped, it properly replaces the default sphere
- Implement proper scaling and positioning for various 3D model formats
- Add fallback to sphere model if 3D model fails to load
- Optimize loading and rendering of 3D ordinal assets

### 6. Implement Room/Fabric Swapping System
- Create different "rooms" or environments that unlock as pet levels increase
- Each room has its own Scene Assembler JSON that can be loaded
- Implement smooth transitions between rooms
- Store room progress and allow swapping between unlocked rooms
- Link rooms to pet progression system

### 7. Make RP1 Sharing Fully Automatic
- Ensure one-click sharing works reliably without requiring manual steps
- Improve error handling and fallback mechanisms
- Provide clear success/error feedback to user
- Automatically handle scene updates when pet changes

### 8. Research and Implement Proper pResource.sReference Linking
- Study OMB wiki guidelines for Scene Assembler JSON structure
- Ensure proper use of pResource.sReference for linking to ordinal assets
- Implement proper object hierarchy and transformations
- Test linking and unlinking of objects in scenes

## Technical Implementation Approach

### Phase 1: Cleanup and Foundation
- Remove redundant LLM chat code from ARView
- Improve WebXR detection logic
- Enhance error handling and user feedback systems

### Phase 2: Interaction Systems
- Implement gesture recognition in AR mode
- Add basic pet interaction responses
- Integrate with existing pet state/mood systems

### Phase 3: Advanced Features
- Enable battle mechanics in AR/XR
- Implement room/fabric swapping system
- Enhance 3D ordinal asset handling
- Improve RP1 sharing reliability

### Phase 4: Polish and Integration
- Refine user experience across all modes
- Ensure consistency between Home, AR, and XR views
- Optimize performance and resource usage
- Test across target browsers and devices

## Success Criteria
- AR mode works reliably in Chrome, Firefox, Safari mobile
- WebXR works in Meta Quest and compatible browsers
- Pet responds to user interactions in AR mode
- Battles can be initiated and viewed in AR/XR
- 3D ordinal assets properly replace default pet model
- Room swapping works based on progression
- RP1 sharing is fully automatic with clear feedback
- No redundant or confusing features in AR mode