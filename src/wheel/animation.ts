// Easing functions + the 60fps rAF animation loop and rotation animation.
import type { Ctor, WheelInstance, WheelAnimation, AnimationOptions } from '../types.ts';

type EasingFn = (t: number) => number;

export const Easing: Record<'linear' | 'easeOut' | 'easeInOut' | 'bounce', EasingFn> = {
    linear: (t) => t,
    easeOut: (t) => 1 - Math.pow(1 - t, 3),
    easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    bounce: (t) => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    },
};

export const AnimationMixin = <T extends Ctor>(Base: T) =>
    class extends Base {
        static Easing = Easing;

        // Shared instance state this mixin reads/writes (initialized by the engine ctor).
        // `declare` = type-only, no runtime emit.
        declare animations: WheelInstance['animations'];
        declare animationId: WheelInstance['animationId'];
        declare isAnimating: WheelInstance['isAnimating'];
        declare animationCounter: WheelInstance['animationCounter'];
        declare svg: WheelInstance['svg'];
        declare currentRotation: WheelInstance['currentRotation'];
        // Provided by the interaction mixin; called from onUpdate below.
        declare updateRotation: () => void;

        // Add a new animation to the system; returns its id for tracking.
        addAnimation(options: AnimationOptions): string {
            const id = `anim_${++this.animationCounter}`;
            const animation: WheelAnimation = {
                id,
                startTime: performance.now(),
                duration: options.duration || 800,
                from: options.from,
                to: options.to,
                easing: options.easing || Easing.easeOut,
                onUpdate: options.onUpdate || (() => {}),
                onComplete: options.onComplete || (() => {}),
                active: true,
            };

            this.animations.set(id, animation);

            // Start animation loop if not already running
            if (!this.isAnimating) {
                this.startAnimationLoop();
            }

            return id;
        }

        // Remove an animation from the system by id.
        removeAnimation(id: string): void {
            this.animations.delete(id);

            // Stop animation loop if no active animations
            if (this.animations.size === 0) {
                this.stopAnimationLoop();
            }
        }

        // Start the 60fps animation loop.
        startAnimationLoop(): void {
            if (this.isAnimating) return;

            this.isAnimating = true;

            // Add visual feedback for animation state
            if (this.svg) {
                this.svg.classList.add('animating');
            }

            const animate = (currentTime: number): void => {
                if (!this.isAnimating) return;

                let hasActiveAnimations = false;

                // Update all active animations
                for (const [id, animation] of this.animations) {
                    if (!animation.active) continue;

                    const elapsed = currentTime - animation.startTime;
                    const progress = Math.min(elapsed / animation.duration, 1);
                    const easedProgress = animation.easing(progress);

                    // Calculate current value based on eased progress
                    let currentValue: number | number[];
                    if (typeof animation.from === 'number' && typeof animation.to === 'number') {
                        currentValue =
                            animation.from + (animation.to - animation.from) * easedProgress;
                    } else if (Array.isArray(animation.from) && Array.isArray(animation.to)) {
                        const to = animation.to;
                        currentValue = animation.from.map(
                            (fromVal, index) => fromVal + (to[index] - fromVal) * easedProgress
                        );
                    } else {
                        currentValue = easedProgress;
                    }

                    // Call update callback
                    animation.onUpdate(currentValue, easedProgress);

                    // Check if animation is complete
                    if (progress >= 1) {
                        animation.active = false;
                        animation.onComplete();
                        this.removeAnimation(id);
                    } else {
                        hasActiveAnimations = true;
                    }
                }

                // Continue loop if there are active animations
                if (hasActiveAnimations) {
                    this.animationId = requestAnimationFrame(animate);
                } else {
                    this.stopAnimationLoop();
                }
            };

            this.animationId = requestAnimationFrame(animate);
        }

        // Stop the animation loop.
        stopAnimationLoop(): void {
            this.isAnimating = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }

            // Remove visual feedback for animation state
            if (this.svg) {
                this.svg.classList.remove('animating');
            }
        }

        // Clear all animations.
        clearAllAnimations(): void {
            this.animations.clear();
            this.stopAnimationLoop();
        }

        // Calculate the shortest rotation path between two angles (-180 to +180).
        getShortestRotationPath(from: number, to: number): number {
            let delta = to - from;
            while (delta > 180) delta -= 360;
            while (delta < -180) delta += 360;
            return delta;
        }

        // Animate wheel rotation to a target angle; resolves when the animation completes.
        animateRotation(
            targetRotation: number,
            duration = 800,
            easing: EasingFn = Easing.easeOut
        ): Promise<void> {
            return new Promise((resolve) => {
                // Calculate shortest path
                const startRotation = this.currentRotation;
                const delta = this.getShortestRotationPath(startRotation, targetRotation);
                const endRotation = startRotation + delta;

                this.addAnimation({
                    duration,
                    from: startRotation,
                    to: endRotation,
                    easing,
                    onUpdate: (rotation) => {
                        this.currentRotation = rotation as number;
                        this.updateRotation();
                    },
                    onComplete: () => {
                        this.currentRotation = targetRotation;
                        this.updateRotation();
                        resolve();
                    },
                });
            });
        }
    };
