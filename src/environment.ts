const environment = {
  host: process.env.HOSTNAME || 'localhost',
  frontendUrl: process.env.HOSTNAME || 'http://localhost:4200',
  pwHashSaltRound: 10,
  accessTokenSecret: 'V50jPXQVocPUSPHl0yzPJhXZzh32bp',
  refreshTokenSecret: '3pqOHs7R1TrCgsRKksPp4J3Kfs0l0X',
  apiKey: 'ZjVlOTk1YjEtNjIwOS00MDM4LWFiNTctZTI1Y2Q3MWIwNjZm',
  activeDirectoryConfig: {
    url: process.env.LDAP_URL || 'ldaps://ldap.teco.edu:636',
    baseDN: process.env.LDAP_BASEDN || 'dc=teco,dc=edu',
    username:
      process.env.LDAP_USERNAME || 'uid=pseteamtwo,ou=People,dc=teco,dc=edu',
    password: process.env.LDAP_PASSWORD || 'asd3412090',
  },
  smtpConfig: {
    host: process.env.SMTP_HOST || 'mail.teco.edu',
    port: process.env.SMTP_POST ? +process.env.SMTP_POST : 25,
    secure: process.env.SMTP_SSL === 'true' || false,
  },
  smtpSender: process.env.SMTP_SENDER || 'noreply@pseteamtwo.dmz.teco.edu',
  livecam_server: {
    host: process.env.LIVECAM_HOST || 'localhost',
    port: process.env.LIVECAM_PORT || 7000,
    ws_port: process.env.LIVECAM_WS_PORT || 9999,
    ws_path: process.env.LIVECAM_WS_PATH || '',
    ws_protocol: process.env.LIVECAM_WS_PROTOCOL || 'ws',
    apiPath: process.env.LIVECAM_PATH || '/api/livecam/v1',
    endpoints: {
      list: '/recordings',
      download: '/recordings/:id',
      schedule: '/recordings',
      delete: '/recordings/:id',
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
      registerMessageWebsocket: '/user/messages/websocket',

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
      getGlobalSettings: '/application-settings',
      updateGlobalSettings: '/application-settings',

      getWhitelistRetailer: '/application-settings/whitelist-retailers/:id',
      getWhitelistRetailers: '/application-settings/whitelist-retailers',

      createWhitelistRetailer: '/application-settings/whitelist-retailers',
      updateWhitelistRetailer: '/application-settings/whitelist-retailers/:id',
      deleteWhitelistRetailer: '/application-settings/whitelist-retailers/:id',

      addDomainToWhitelistRetailer:
        '/application-settings/whitelist-retailers/:id/domains',
      updateDomainOfWhitelistRetailer:
        '/application-settings/whitelist-retailers/:id/domains/:domainId',
      deleteDomainOfWhitelistRetailer:
        '/application-settings/whitelist-retailers/:id/domains/:domainId',

      checkDomainAgainstWhitelist:
        '/application-settings/whitelist-retailers/check',
    },
    user_management: {
      getAllPendingUsers: '/users/pending',
      getAllAcceptedUsers: '/users/accepted',
      getSingleUser: '/users/:id',

      updateUser: '/users/:id',
      deleteUser: '/users/:id',
    },
    rooms: {
      getAllRooms: '/rooms',
      getSingleRoom: '/rooms/:id',
      getRoomCalendar: '/rooms/:id/calendar',

      createRoom: '/rooms',
      updateRoom: '/rooms/:id',
      deleteRoom: '/rooms/:id',

      getAllAvailableTimeslotsForRoom: '/rooms/:roomId/timeslots/available',
      getAllUnavailableTimeslotsForRoom: '/rooms/:roomId/timeslots/unavailable',
      getAvailabilityCalendar: '/rooms/:id/availability-calendar',
      getTimeslot: '/rooms/:id/timeslot/:timeslotId',

      createTimeslot: '/rooms/:roomId/timeslots',
      createTimeslotSeries: '/rooms/:roomId/timeslots/series',
      updateTimeslot: '/rooms/:roomId/timeslots/:timeslotId',
      updateTimeslotSeries: '/rooms/:roomId/timeslots/series/:seriesId',
      deleteTimeslot: '/rooms/:roomId/timeslots/:timeslotId',
      deleteTimeslotSeries: '/rooms/:roomId/timeslots/series/:seriesId',
    },
    appointments: {
      getCurrentUserAppointments: '/user/appointments',
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
      getByName: '/inventory-items/name/:name',

      createItem: '/inventory-items',
      updateItem: '/inventory-items/:id',
      deleteItem: '/inventory-items/:id',
    },
    orders: {
      getCurrentUsersPendingOrders: '/user/orders/pending',
      getCurrentUsersAcceptedOrders: '/user/orders/accepted',
      getCurrentUsersDeclinedOrders: '/user/orders/declined',

      getAllPendingOrders: '/orders/pending',
      getAllAcceptedOrders: '/orders/accepted',
      getAllDeclinedOrders: '/orders/declined',
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

      registerWebSocket: '/livecam/register',
    },
  },
};

export default environment;
