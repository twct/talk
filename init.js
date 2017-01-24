const SettingsService = require('./services/settings');

module.exports = () => Promise.all([

  // Upsert the settings object.
  SettingsService.init({
    id: '1',
    moderation: 'PRE',
    wordlist: {
      banned: [],
      suspect: []
    }
  })
]);
