import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { home, search, library } from 'ionicons/icons';
import { PlayerProvider } from './context/PlayerContext';
import PlayerBar from './components/PlayerBar';
import NowPlayingModal from './components/NowPlayingModal';
import Home from './pages/Home';
import Search from './pages/Search';
import Library from './pages/Library';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <PlayerProvider>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/home">
              <Home />
            </Route>
            <Route exact path="/search">
              <Search />
            </Route>
            <Route exact path="/library">
              <Library />
            </Route>
            <Route exact path="/">
              <Redirect to="/home" />
            </Route>
          </IonRouterOutlet>
          <PlayerBar />
          <IonTabBar slot="bottom" className="main-tab-bar">
            <IonTabButton tab="home" href="/home">
              <IonIcon aria-hidden="true" icon={home} />
              <IonLabel>Home</IonLabel>
            </IonTabButton>
            <IonTabButton tab="search" href="/search">
              <IonIcon aria-hidden="true" icon={search} />
              <IonLabel>Search</IonLabel>
            </IonTabButton>
            <IonTabButton tab="library" href="/library">
              <IonIcon aria-hidden="true" icon={library} />
              <IonLabel>Library</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
      {/* Rendered at App level so it overlays the tab bar (outside the
          footer/toolbar stacking context of PlayerBar). */}
      <NowPlayingModal />
    </PlayerProvider>
  </IonApp>
);

export default App;