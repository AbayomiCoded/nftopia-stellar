import { TransitionPresets, TransitionSpecs } from '@react-navigation/stack';
import { Easing } from 'react-native-reanimated';

export const TRANSITION_CONFIG = {
  // Default animation durations
  durations: {
    fast: 200,
    normal: 350,
    slow: 500,
    verySlow: 700,
  },

  // Default easing functions
  easing: {
    standard: Easing.inOut(Easing.ease),
    accelerate: Easing.in(Easing.ease),
    decelerate: Easing.out(Easing.ease),
    spring: Easing.inOut(Easing.ease),
  },

  // Stack navigation presets
  stackPresets: {
    // Slide from right (default)
    slideFromRight: {
      ...TransitionPresets.SlideFromRightIOS,
      transitionSpec: {
        open: {
          animation: 'timing',
          config: {
            duration: 350,
            easing: Easing.inOut(Easing.ease),
          },
        },
        close: {
          animation: 'timing',
          config: {
            duration: 250,
            easing: Easing.inOut(Easing.ease),
          },
        },
      },
    },

    // Slide from bottom (modal-like)
    slideFromBottom: {
      ...TransitionPresets.ModalSlideFromBottomIOS,
      transitionSpec: {
        open: {
          animation: 'timing',
          config: {
            duration: 400,
            easing: Easing.inOut(Easing.ease),
          },
        },
        close: {
          animation: 'timing',
          config: {
            duration: 300,
            easing: Easing.inOut(Easing.ease),
          },
        },
      },
    },

    // Fade transition
    fade: {
      ...TransitionPresets.FadeFromBottomAndroid,
      transitionSpec: {
        open: {
          animation: 'timing',
          config: {
            duration: 300,
            easing: Easing.inOut(Easing.ease),
          },
        },
        close: {
          animation: 'timing',
          config: {
            duration: 200,
            easing: Easing.inOut(Easing.ease),
          },
        },
      },
    },

    // Scale transition
    scale: {
      ...TransitionPresets.ModalSlideFromBottomIOS,
      transitionSpec: {
        open: {
          animation: 'spring',
          config: {
            stiffness: 300,
            damping: 30,
            mass: 1,
          },
        },
        close: {
          animation: 'spring',
          config: {
            stiffness: 300,
            damping: 30,
            mass: 1,
          },
        },
      },
    },

    // Default (no animation)
    none: {
      transitionSpec: {
        open: {
          animation: 'timing',
          config: {
            duration: 0,
          },
        },
        close: {
          animation: 'timing',
          config: {
            duration: 0,
          },
        },
      },
    },
  },

  // Screen-specific transitions
  screenTransitions: {
    // Auth screens - slide from right
    auth: {
      ...TransitionPresets.SlideFromRightIOS,
      transitionSpec: {
        open: {
          animation: 'timing',
          config: {
            duration: 300,
            easing: Easing.inOut(Easing.ease),
          },
        },
        close: {
          animation: 'timing',
          config: {
            duration: 200,
            easing: Easing.inOut(Easing.ease),
          },
        },
      },
    },

    // Detail screens - slide from right with spring
    detail: {
      ...TransitionPresets.SlideFromRightIOS,
      transitionSpec: {
        open: {
          animation: 'spring',
          config: {
            stiffness: 400,
            damping: 30,
            mass: 1,
          },
        },
        close: {
          animation: 'spring',
          config: {
            stiffness: 400,
            damping: 30,
            mass: 1,
          },
        },
      },
    },

    // Modal screens - slide from bottom
    modal: {
      ...TransitionPresets.ModalSlideFromBottomIOS,
      transitionSpec: {
        open: {
          animation: 'timing',
          config: {
            duration: 400,
            easing: Easing.inOut(Easing.ease),
          },
        },
        close: {
          animation: 'timing',
          config: {
            duration: 300,
            easing: Easing.inOut(Easing.ease),
          },
        },
      },
    },

    // Creator screens - fade
    creator: {
      ...TransitionPresets.FadeFromBottomAndroid,
      transitionSpec: {
        open: {
          animation: 'timing',
          config: {
            duration: 300,
            easing: Easing.inOut(Easing.ease),
          },
        },
        close: {
          animation: 'timing',
          config: {
            duration: 200,
            easing: Easing.inOut(Easing.ease),
          },
        },
      },
    },
  },
};

// Helper to get transition config
export const getTransitionConfig = (
  type: keyof typeof TRANSITION_CONFIG.screenTransitions
) => {
  return TRANSITION_CONFIG.screenTransitions[type] || TRANSITION_CONFIG.stackPresets.slideFromRight;
};