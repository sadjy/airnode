import * as fixtures from 'test/fixtures';
import { ApiCallTemplate, RequestErrorCode, RequestStatus } from '../../types';
import * as application from './template-application';

describe('mergeApiCallsWithTemplates', () => {
  it('returns API calls without a template ID', () => {
    const apiCall = fixtures.requests.createApiCall({ templateId: null });
    const [logs, res] = application.mergeApiCallsWithTemplates([apiCall], {});
    expect(logs).toEqual([{ level: 'DEBUG', message: `Request:${apiCall.id} is not linked to a template` }]);
    expect(res).toEqual([apiCall]);
  });

  it('merges the template into the API call', () => {
    const apiCall = fixtures.requests.createApiCall({
      templateId: 'templateId-0',
      endpointId: null,
      fulfillAddress: null,
      fulfillFunctionId: null,
      parameters: {},
    });

    const templatesById: { [id: string]: ApiCallTemplate } = {
      'templateId-0': {
        designatedWallet: 'designatedWallet-0',
        encodedParameters:
          '0x315375000000000000000000000000000000000000000000000000000000000066726f6d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0616d6f756e74000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e800000000000000000000000000000000000000000000000000000000000000034554480000000000000000000000000000000000000000000000000000000000',
        endpointId: 'templateEndpointId-0',
        fulfillAddress: 'templateFulfillAddress-0',
        fulfillFunctionId: 'templateFulfillFunctionId-0',
        id: 'templateId-0',
        providerId: 'templateProviderId-0',
        requesterIndex: '5',
      },
    };

    const [logs, res] = application.mergeApiCallsWithTemplates([apiCall], templatesById);
    expect(logs).toEqual([{ level: 'DEBUG', message: `Template ID:templateId-0 applied to Request:${apiCall.id}` }]);
    expect(res[0].endpointId).toEqual('templateEndpointId-0');
    expect(res[0].fulfillAddress).toEqual('templateFulfillAddress-0');
    expect(res[0].fulfillFunctionId).toEqual('templateFulfillFunctionId-0');
    // These fields are not overwritten
    expect(res[0].designatedWallet).toEqual('designatedWallet');
    expect(res[0].requesterIndex).toEqual('3');
  });

  it('merges template and API call parameters', () => {
    const apiCall = fixtures.requests.createApiCall({
      templateId: 'templateId-0',
      parameters: {
        to: 'USD',
        date: '2020-10-24',
      },
    });

    const templatesById: { [id: string]: ApiCallTemplate } = {
      'templateId-0': {
        designatedWallet: 'designatedWallet-0',
        endpointId: 'templateEndpointId-0',
        fulfillAddress: 'templateFulfillAddress-0',
        fulfillFunctionId: 'templateFulfillFunctionId-0',
        encodedParameters:
          '0x315375000000000000000000000000000000000000000000000000000000000066726f6d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0616d6f756e74000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e800000000000000000000000000000000000000000000000000000000000000034554480000000000000000000000000000000000000000000000000000000000',
        id: 'templateId-0',
        providerId: 'templateProviderId-0',
        requesterIndex: '5',
      },
    };

    const [logs, res] = application.mergeApiCallsWithTemplates([apiCall], templatesById);
    expect(logs).toEqual([{ level: 'DEBUG', message: `Template ID:templateId-0 applied to Request:${apiCall.id}` }]);
    expect(res[0].parameters).toEqual({
      from: 'ETH',
      amount: '1000',
      to: 'USD',
      date: '2020-10-24',
    });
  });

  it('overwrites template parameters with request parameters with the same name', () => {
    const apiCall = fixtures.requests.createApiCall({
      templateId: 'templateId-0',
      endpointId: 'requestEndpointId',
      fulfillAddress: 'requestFulfillAddress',
      fulfillFunctionId: 'requestFulfillFunctionId',
      parameters: { from: 'BTC', amount: '5000' },
    });

    const templatesById: { [id: string]: ApiCallTemplate } = {
      'templateId-0': {
        designatedWallet: 'designatedWallet-0',
        endpointId: 'templateEndpointId-0',
        fulfillAddress: 'templateFulfillAddress-0',
        fulfillFunctionId: 'templateFulfillFunctionId-0',
        encodedParameters:
          '0x315375000000000000000000000000000000000000000000000000000000000066726f6d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0616d6f756e74000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e800000000000000000000000000000000000000000000000000000000000000034554480000000000000000000000000000000000000000000000000000000000',
        id: 'templateId-0',
        providerId: 'templateProviderId-0',
        requesterIndex: '5',
      },
    };

    const [logs, res] = application.mergeApiCallsWithTemplates([apiCall], templatesById);
    expect(logs).toEqual([{ level: 'DEBUG', message: `Template ID:templateId-0 applied to Request:${apiCall.id}` }]);
    expect(res[0].endpointId).toEqual('requestEndpointId');
    expect(res[0].fulfillAddress).toEqual('requestFulfillAddress');
    expect(res[0].fulfillFunctionId).toEqual('requestFulfillFunctionId');
    expect(res[0].parameters).toEqual({ from: 'BTC', amount: '5000' });
  });

  it('blocks API calls where the template cannot be found', () => {
    const apiCall = fixtures.requests.createApiCall({ templateId: 'templateId-0' });
    const [logs, res] = application.mergeApiCallsWithTemplates([apiCall], {});
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Unable to fetch template ID:templateId-0 for Request ID:apiCallId' },
    ]);
    expect(res[0].status).toEqual(RequestStatus.Blocked);
    expect(res[0].errorCode).toEqual(RequestErrorCode.TemplateNotFound);
  });

  it('invalidates API calls with invalid template parameters', () => {
    const apiCall = fixtures.requests.createApiCall({ templateId: 'templateId-0' });

    const templatesById: { [id: string]: ApiCallTemplate } = {
      'templateId-0': {
        designatedWallet: 'designatedWallet-0',
        endpointId: 'templateEndpointId-0',
        fulfillAddress: 'templateFulfillAddress-0',
        fulfillFunctionId: 'templateFulfillFunctionId-0',
        encodedParameters: 'invalid-parameters',
        id: 'templateId-0',
        providerId: 'templateProviderId-0',
        requesterIndex: '5',
      },
    };

    const [logs, res] = application.mergeApiCallsWithTemplates([apiCall], templatesById);
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Template ID:templateId-0 contains invalid parameters: invalid-parameters' },
    ]);
    expect(res[0].status).toEqual(RequestStatus.Errored);
    expect(res[0].errorCode).toEqual(RequestErrorCode.TemplateParameterDecodingFailed);
  });
});
