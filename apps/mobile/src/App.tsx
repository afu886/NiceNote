import React from 'react'

import { NavigationContainer } from '@react-navigation/native'

import { RootNavigator } from './navigation'

export default function App(): React.JSX.Element {
  return (
    // experimental：mobile 当前仅保留最小导航壳，不接入共享 app-shell runtime。
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  )
}
