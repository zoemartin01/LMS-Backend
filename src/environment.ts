const environment = {
  host: process.env.HOSTNAME || 'localhost',
  frontendUrl: process.env.HOSTNAME || 'http://localhost:4200',
  pwHashSaltRound: 10,
  accessTokenSecret: 'V50jPXQVocPUSPHl0yzPJhXZzh32bp',
  refreshTokenSecret: '3pqOHs7R1TrCgsRKksPp4J3Kfs0l0X',
  activeDirectoryConfig: {
    url: process.env.LDAP_URL || 'ldaps://ldap.teco.edu:636',
    //baseDN: 'dc=',
  },
  //@todo add SMTP credentials & sender email
  smtpConfig: {
    host: process.env.SMTP_HOST || 'mail.teco.edu',
    port: process.env.SMTP_POST ? +process.env.SMTP_POST : 25,
    secure: process.env.SMTP_SSL === 'true' || true,
    auth: {
      user: process.env.SMTP_USERNAME || 'username',
      pass: process.env.SMTP_PASSWORD || 'password',
    },
  },
  smtpSender: process.env.SMTP_SENDER || '',
  livecam_server: {
    host: process.env.LIVECAM_HOST || 'localhost',
    port: process.env.LIVECAM_PORT || 7000,
    ws_port: process.env.LIVECAM_WS_PORT || 9999,
    apiPath: process.env.LIVECAM_PATH || '/api',
    endpoints: {
      list: '/recordings',
      download: '/recordings/:id',
      schedule: '/recordings',
    },
  },
  apiRoutes: {
    base: '/api/v1',
    auth: {
      login: '/token',
      logout: '/token',
      tokenRefresh: '/token/refresh',
      tokenCheck: '/token/check',
    },
    messages: {
      getCurrentUserMessages: '/user/messages',
      getCurrentUserUnreadMessagesAmounts: '/user/messages/unread-amounts',

      deleteMessage: '/messages/:id',
      updateMessage: '/messages/:id',
    },
    user_settings: {
      getCurrentUser: '/user',

      register: '/users',
      updateCurrentUser: '/user',
      deleteCurrentUser: '/user',

      verifyEmail: '/user/verify-email',
    },
    admin_settings: {
      getGlobalSettings: '/global-settings',
      updateGlobalSettings: '/global-settings',

      getWhitelistRetailer: '/global-settings/whitelist-retailers/:id',
      getWhitelistRetailers: '/global-settings/whitelist-retailers',

      createWhitelistRetailer: '/global-settings/whitelist-retailers',
      updateWhitelistRetailer: '/global-settings/whitelist-retailers/:id',
      deleteWhitelistRetailer: '/global-settings/whitelist-retailers/:id',

      addDomainToWhitelistRetailer:
        '/global-settings/whitelist-retailers/:id/domains',
      updateDomainOfWhitelistRetailer:
        '/global-settings/whitelist-retailers/:id/domains/:domainId',
      deleteDomainOfWhitelistRetailer:
        '/global-settings/whitelist-retailers/:id/domains/:domainId',

      checkDomainAgainstWhitelist: '/global-settings/whitelist-retailers/check',
    },
    user_management: {
      getAllUsers: '/users',
      getSingleUser: '/users/:id',

      updateUser: '/users/:id',
      deleteUser: '/users/:id',
    },
    rooms: {
      getAllRooms: '/rooms',
      getSingleRoom: '/rooms/:id',

      createRoom: '/rooms',
      updateRoom: '/rooms/:id',
      deleteRoom: '/rooms/:id',

      createTimeslot: '/rooms/:roomId/timeslots',
      deleteTimeslot: '/rooms/:roomId/timeslots/:timeslotId',
    },
    appointments: {
      getCurrentUserAppointments: '/user/appointments',
      getRoomAppointments: '/rooms/:id/appointments',
      getSeriesAppointments: '/appointments/series/:id',

      getAllAppointments: '/appointments',
      getSingleAppointment: '/appointments/:id',

      createAppointment: '/appointments',
      createAppointmentSeries: '/appointments/series',
      updateAppointment: '/appointments/:id',
      updateAppointmentSeries: '/appointments/series/:id',
      deleteAppointment: '/appointments/:id',
      deleteAppointmentSeries: '/appointments/series/:id',
    },
    inventory_item: {
      getAllItems: '/inventory-items',
      getSingleItem: '/inventory-items/:id',

      createItem: '/inventory-items',
      updateItem: '/inventory-items/:id',
      deleteItem: '/inventory-items/:id',
    },
    orders: {
      getCurrentUserOrders: '/user/orders',

      getAllOrders: '/orders',
      getSingleOrder: '/orders/:id',

      createOrder: '/orders',
      updateOrder: '/orders/:id',
      deleteOrder: '/orders/:id',
    },
    livecam: {
      getAllRecordings: '/livecam/recordings',
      getAllScheduled: '/livecam/recordings/schedules',
      getSingleRecording: '/livecam/recordings/:id',

      createSchedule: '/livecam/recordings/schedules',
      updateRecording: '/livecam/recordings/:id',
      deleteRecording: '/livecam/recordings/:id',

      downloadRecording: '/livecam/recordings/:id/download',
      streamFeed: '/livecam/stream',
    },
  },
};

export default environment;
