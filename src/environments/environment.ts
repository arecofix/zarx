export const environment = {
  production: false,
  supabase: {
    url: 'https://db.arecofix.com.ar',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjIxNDc0ODM2NDd9.TdzO-2RiVSa03fhDKFRpxakwu1EghB4ZxtMzimKUOtk',
    schema: 'zarx'
  },
  authRedirectUrl: 'http://localhost:4200',
  enableProfileUpsert: false
};
