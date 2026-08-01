export const environment = {
    production: false,
    useMockApi: false,
    apiGatewayUrl: 'http://localhost:8080',
    auth_apiBaseUrl: 'http://localhost:8080/auth',
    user_apiBaseUrl: 'http://localhost:8080/auth/users',
    appointment_apiBaseUrl: 'http://localhost:8080/book/api/appointments',
    scheduler_apiBaseUrl: 'http://localhost:8080/book/api/schedulers',
    chat_apiBaseUrl: 'http://localhost:8080/chat',
    i18n_apiBaseUrl: 'http://localhost:8080/i18n',
    whatsappPhoneId: '1168782922978723',
    // Configurable phone numbers used by QR generator (changeable from one place)
    supportPhoneNumber: '125482568',
    clinicPhoneNumber: '125482568'
};
