import assert from 'node:assert/strict';
import test from 'node:test';
import {
  chooseActiveVehicle,
  collectDiagnosisSymptoms,
  consumeDiagnosisBookingHandoff,
  mapRecommendedDiagnosisService,
  MAX_DIAGNOSIS_BOOKING_DESCRIPTION_LENGTH,
  shouldPromptForVehicleSelection,
  storeDiagnosisBookingHandoff,
} from './diagnosisBooking.ts';

test('only prompts for a vehicle when there are multiple saved cars', () => {
  assert.equal(shouldPromptForVehicleSelection(0), false);
  assert.equal(shouldPromptForVehicleSelection(1), false);
  assert.equal(shouldPromptForVehicleSelection(2), true);
});

test('uses the saved car when it exists and otherwise defaults to the first car', () => {
  const cars = [{ id: 'car-1' }, { id: 'car-2' }];
  assert.equal(chooseActiveVehicle(cars, 'car-2'), cars[1]);
  assert.equal(chooseActiveVehicle(cars, 'deleted-car'), cars[0]);
  assert.equal(chooseActiveVehicle([], null), null);
});

test('maps diagnosis recommendations to supported rescue services', () => {
  assert.equal(mapRecommendedDiagnosisService('tow'), 'tow');
  assert.equal(mapRecommendedDiagnosisService('tyre'), 'tyre');
  assert.equal(mapRecommendedDiagnosisService('fuel'), 'fuel');
  assert.equal(mapRecommendedDiagnosisService('battery'), 'battery');
  assert.equal(mapRecommendedDiagnosisService('mechanic'), 'diagnostics');
  assert.equal(mapRecommendedDiagnosisService('unknown'), null);
  assert.equal(mapRecommendedDiagnosisService(null), null);
});

test('collects only typed client symptoms up to the selected AI response', () => {
  const messages = [
    { role: 'user', text: 'It clicks when I start it.', imageUri: null },
    { role: 'assistant', text: 'Can you describe the sound?' },
    { role: 'user', text: 'The lights dim too.', imageUri: 'file://photo.jpg' },
    { role: 'assistant', text: 'Possible battery issue.' },
    { role: 'user', text: 'A later follow-up.' },
  ];
  assert.equal(
    collectDiagnosisSymptoms(messages, 3),
    'It clicks when I start it.\nThe lights dim too.',
  );
});

test('bounds transferred symptom text to the booking field limit', () => {
  const longText = 'x'.repeat(MAX_DIAGNOSIS_BOOKING_DESCRIPTION_LENGTH + 100);
  const symptoms = collectDiagnosisSymptoms([{ role: 'user', text: longText }], 0);
  assert.equal(symptoms.length, MAX_DIAGNOSIS_BOOKING_DESCRIPTION_LENGTH);
});

test('handoffs are private to an account and can only be consumed once', () => {
  const accountId = `diagnosis-booking-${Date.now()}-${Math.random()}`;
  assert.equal(storeDiagnosisBookingHandoff(accountId, 'tyre', 'Front tyre is flat.'), true);
  assert.equal(consumeDiagnosisBookingHandoff(`${accountId}-other`), null);
  assert.deepEqual(consumeDiagnosisBookingHandoff(accountId)?.service, 'tyre');
  assert.equal(consumeDiagnosisBookingHandoff(accountId), null);
});

test('does not store a handoff without an account identity', () => {
  assert.equal(storeDiagnosisBookingHandoff('  ', 'tow', 'Needs towing.'), false);
});