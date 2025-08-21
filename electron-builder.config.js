module.exports = {
  appId: 'com.workdaytracker.app',
  productName: 'Workday Tracker',
  directories: {
    output: 'dist-electron'
  },
  files: [
    'dist/**/*',
    'public/electron.js',
    'node_modules/**/*'
  ],
  extraMetadata: {
    main: 'public/electron.js'
  },
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    icon: 'public/favicon.ico'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  },
  mac: {
    category: 'public.app-category.productivity',
    target: 'dmg'
  },
  linux: {
    target: 'AppImage',
    category: 'Office'
  }
};