export class PollenTracker {
  private totalCost = 0;
  private imageCount = 0;
  private readonly FLUX_COST_PER_IMAGE = 0.0002;

  trackGeneration(imageCount: number) {
    const cost = imageCount * this.FLUX_COST_PER_IMAGE;
    this.totalCost += cost;
    this.imageCount += imageCount;

    console.log(`Generated ${imageCount} images`);
    console.log(`Session cost: ${this.totalCost.toFixed(4)} pollen`);
    console.log(`Total images: ${this.imageCount}`);
    console.log(`Remaining balance: ~${(23 - this.totalCost).toFixed(2)} pollen`);
    console.log(
      `Images remaining: ~${Math.floor((23 - this.totalCost) / this.FLUX_COST_PER_IMAGE)}`
    );
  }

  getStats() {
    return {
      totalCost: this.totalCost,
      imageCount: this.imageCount,
      averageCostPerImage: this.FLUX_COST_PER_IMAGE,
      remainingPollen: 23 - this.totalCost,
      imagesRemaining: Math.floor((23 - this.totalCost) / this.FLUX_COST_PER_IMAGE)
    };
  }
}
