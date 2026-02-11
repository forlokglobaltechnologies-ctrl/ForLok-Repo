import * as Font from 'expo-font';

export const loadFonts = async () => {
  await Font.loadAsync({
    'MomoTrustDisplay-Regular': require('../../assets/fonts/MomoTrustDisplay-Regular.ttf'),
  });
};











