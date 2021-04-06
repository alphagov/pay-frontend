const expect = require('chai').expect

const userIpAddress = require('../../app/utils/user_ip_address')

describe('user ip address', () => {
  it('returns the address provided in x-forwarded-for header', () => {
    const result = userIpAddress({
      headers: { 'x-forwarded-for': '127.0.0.1, 0.0.0.0' },
      connection: { remoteAddress: '0.0.0.0', socket: { remoteAddress: '0.0.0.0' } },
      socket: { remoteAddress: '0.0.0.0' }
    })
    expect(result).to.equal('127.0.0.1')
  })

  it('returns the address provided as connection remote address', () => {
    const result = userIpAddress({
      headers: {},
      connection: { remoteAddress: '127.0.0.1', socket: { remoteAddress: '0.0.0.0' } },
      socket: { remoteAddress: '0.0.0.0' }
    })
    expect(result).to.equal('127.0.0.1')
  })

  it('returns the address provided as socket remote address', () => {
    const result = userIpAddress({
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      connection: { socket: { remoteAddress: '0.0.0.0' } }
    })
    expect(result).to.equal('127.0.0.1')
  })

  it('returns the address provided as connection socket remote address', () => {
    const result = userIpAddress({
      headers: {},
      connection: { socket: { remoteAddress: '127.0.0.1' } }
    })
    expect(result).to.equal('127.0.0.1')
  })
})
