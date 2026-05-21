// AssetManager handles preloading of any assets
// For this hackathon version, all graphics are procedural so this is minimal
export class AssetManager {
  private loaded = false;

  async preload(): Promise<void> {
    // All graphics are procedural (PixiJS Graphics API)
    // All audio is generated (Web Audio API)
    // Nothing to preload for hackathon version
    this.loaded = true;
  }

  get isLoaded(): boolean {
    return this.loaded;
  }
}
