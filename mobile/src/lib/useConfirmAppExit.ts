/**
 * Hardware back: pop stack / close overlays first; only exit after user confirms.
 */
import { useCallback } from 'react';
import { Alert, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export function confirmAppExit(): void {
  Alert.alert(
    'अॅप बंद करायचे? (Exit MahaTicket)',
    'तुम्हाला महाटिकिट अॅपमधून बाहेर पडायचे आहे का?',
    [
      { text: 'नाही (Stay)', style: 'cancel' },
      {
        text: 'होय, बंद करा (Exit)',
        style: 'destructive',
        onPress: () => BackHandler.exitApp(),
      },
    ]
  );
}

/** Use on root tab screens (Home). Returns true so Android does not finish the Activity. */
export function useConfirmAppExitOnBack(enabled = true) {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;
      const onBackPress = () => {
        confirmAppExit();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [enabled])
  );
}
