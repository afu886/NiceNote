import React from 'react'
import { SafeAreaView, StyleSheet, Text, View } from 'react-native'

// experimental：当前仅保留占位编辑页，不接入 editor bridge、数据层或保存链路。

export function NoteEditorScreen(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.placeholder}>Editor will be rendered here via WebView bridge</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  placeholder: {
    fontSize: 16,
    color: '#a3a3a3',
    textAlign: 'center',
  },
})
