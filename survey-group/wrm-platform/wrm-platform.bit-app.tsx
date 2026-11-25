import { Platform } from '@bitdev/platforms.platform';

const WrmService = import.meta.resolve('@subtopo-geo/survey-group.wrm-service');
const WrmApp = import.meta.resolve('@subtopo-geo/survey-group.wrm-app');
const PlatformGateway = import.meta.resolve('@bitdev/platforms.backend.gateway-server');

/** Survey Group Work Request Manager platform — composes the web app and the WRM service. */
export const WrmPlatform = Platform.from({
  name: 'wrm-platform',

  frontends: {
    main: WrmApp,
    mainPortRange: [3000, 3100],
  },

  backends: {
    main: PlatformGateway,
    services: [WrmService],
  },
});

export default WrmPlatform;
