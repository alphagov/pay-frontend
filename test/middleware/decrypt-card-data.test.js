const path = require('path')
const sinon = require('sinon')
const proxyquire = require('proxyquire')
const { expect } = require('chai')

describe('decryptCardData middleware', function () {
  let next
  beforeEach(function () {
    next = sinon.stub()
    next.promise = new Promise(
      (resolve, reject) => next.callsFake(err => err ? reject(err) : resolve())
    )
  })

  describe('with mocked crypto', function () {
    const decryptCardDataFactory = proxyquire(path.join(__dirname, '../../app/middleware/decrypt_card_data.js'), {
      '@aws-crypto/decrypt-node': {
        decrypt: (_, cipherText) => Promise.resolve({ plaintext: Buffer.from(`decrypted(${cipherText})`) })
      },
      '@aws-crypto/raw-rsa-keyring-node': {
        RawRsaKeyringNode: function () {}
      }
    })

    it('should validate environment variables are set', function () {
      const defaultEnv = {
        DECRYPT_AND_OMIT_CARD_DATA: 'true',
        DECRYPT_CARD_DATA_PRIVATE_KEY: 'some-value-that-should-not-matter',
        DECRYPT_CARD_DATA_KEY_NAME: 'some-value-that-should-not-matter',
        DECRYPT_CARD_DATA_KEY_NAMESPACE: 'some-value-that-should-not-matter'
      }
      expect(() =>
        decryptCardDataFactory({ ...defaultEnv, DECRYPT_CARD_DATA_PRIVATE_KEY: undefined })
      ).to.throw('DECRYPT_CARD_DATA_PRIVATE_KEY is required')
      expect(() =>
        decryptCardDataFactory({ ...defaultEnv, DECRYPT_CARD_DATA_KEY_NAME: undefined })
      ).to.throw('DECRYPT_CARD_DATA_KEY_NAME is required')
      expect(() =>
        decryptCardDataFactory({ ...defaultEnv, DECRYPT_CARD_DATA_KEY_NAMESPACE: undefined })
      ).to.throw('DECRYPT_CARD_DATA_KEY_NAMESPACE is required')
    })

    describe('when disabled', function () {
      const decryptCardDataMiddleware = decryptCardDataFactory({
        DECRYPT_AND_OMIT_CARD_DATA: undefined,
        DECRYPT_CARD_DATA_PRIVATE_KEY: 'some-value-that-should-not-matter',
        DECRYPT_CARD_DATA_KEY_NAME: 'some-value-that-should-not-matter',
        DECRYPT_CARD_DATA_KEY_NAMESPACE: 'some-value-that-should-not-matter'
      })

      it('should call next without decrypting card data', async function () {
        const req = {
          body: {
            cardNo: 'some magic cardNo',
            expiryMonth: '01',
            expiryYear: '20',
            cvc: '123'
          }
        }
        decryptCardDataMiddleware(req, {}, next)
        await next.promise
        expect(req.body.cardNo).to.eq('some magic cardNo')
        expect(req.body.expiryMonth).to.eq('01')
        expect(req.body.expiryYear).to.eq('20')
        expect(req.body.cvc).to.eq('123')
        expect(next.calledOnce).to.equal(true)
      })
    })

    describe('when enabled', function () {
      const decryptCardDataMiddleware = decryptCardDataFactory({
        DECRYPT_AND_OMIT_CARD_DATA: 'true',
        DECRYPT_CARD_DATA_PRIVATE_KEY: '-----FAKE RSA KEY-----',
        DECRYPT_CARD_DATA_KEY_NAME: 'some-key-name',
        DECRYPT_CARD_DATA_KEY_NAMESPACE: 'some-key-namespace'
      })

      it('should decrypt card data', async function () {
        const req = {
          body: {
            cardNo: Buffer.from('some magic cardNo').toString('base64'),
            expiryMonth: Buffer.from('01').toString('base64'),
            expiryYear: Buffer.from('20').toString('base64'),
            cvc: Buffer.from('123').toString('base64')
          }
        }
        decryptCardDataMiddleware(req, {}, next)
        await next.promise
        expect(req.body.cardNo).to.eq('decrypted(some magic cardNo)')
        expect(req.body.expiryMonth).to.eq('decrypted(01)')
        expect(req.body.expiryYear).to.eq('decrypted(20)')
        expect(req.body.cvc).to.eq('decrypted(123)')
      })

      it('should ignore missing card data', async function () {
        const req = {
          body: {}
        }
        try {
          decryptCardDataMiddleware(req, {}, next)
          await next.promise
        } catch (rejection) {
          expect(rejection).to.eq('should not have happened')
        }
      })

      it('should not decrypt non-card data', async function () {
        const req = {
          body: {
            some_thing: 'some thing',
            some_other_thing: 'some other thing',
            some_thing_else: 'some thing else'
          }
        }
        decryptCardDataMiddleware(req, {}, next)
        await next.promise
        expect(req.body.some_thing).to.eq('some thing')
        expect(req.body.some_other_thing).to.eq('some other thing')
        expect(req.body.some_thing_else).to.eq('some thing else')
      })
    })
  })

  describe('when enabled with real crypto', function () {
    // This key is committed to a public repository, so you MUST NOT use it in
    // production.
    const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAr0f1VSMpRE4LjrpAodu9k1mT3C/RMw7AIHn+9LvpkzzHIgx1
B2dNU45p2uxXFhGVQSyJVm/Rx0ICsvnnp7piCl8eI0dCmfShZNrrdkq/s1uGXr5V
wPedGSxK2yo0a4SX308LCIpcXMweKZJDfba/IohSiDBFMsWf2prYvXag6hkKf2ia
6s76O4Ys2FBvhc2q0nH7GOQX/OmN/uIdfX6ZB0zeq3uTRuom9WOCDb+wA2fcaOK9
Wa6dswB+aDJ+hDPp7OCKO/fkXQX8st/t0iGoS4K1qVsWsRFnJYMAUXeFOHv1XnKq
6grTODW8L7C32o1aR102OF2/jkF64y/xUOlB2wIDAQABAoIBAA182QkDGqLR6pvC
A0UxNoZHJ1STLWLjaK9XE+JbL18QFzashLjcHxwl4klhVFYzZivMtIi9NARENRb2
mffTJMYtiZEnY52bMGwlWGcS22t+yHkz5j9iDmmoed4hgkUfv9wEJhIzK2ZMoqmK
Qr1CubR7jvZB2KFOib11muYBYeKBiCf/mmlCQLF9n8DWWGbw/JD0glQgtjcHJ2W8
0+J83u+3CrZjWNiWnjeIbvk1nFBU8BdU4egNfnPDytNcUWpflRKL1TzZZr4TnCbp
lHs4rKvFjpvQJ4PfGRDg200P9EAeEFYVtbzj3XFpcT/xqMXoQi3zcgyUFUZLwZ0b
L77elCECgYEA3Fpht0HBYG3XMm8M97o9JmzHLxy0wxK9gaIzEtu/rhFpEADikN1G
spoKxTgZyG/Um+2UyW6W2yCwNpfHDQR3mOPCKaNrTeiiIXWfIC36Hr7Yoj4WNCFi
M5LZw57BGuqm1zqGiOi6qM3rSCW6bzTO0l/h4JCyRquD0CcNTMJr4fECgYEAy6L7
s1cwU05aStkKJNVKlxS/Fnk2ks7+seg4lC9JYQGrCDXWudL/9JPdNFmNdfiH6QCp
UJ2bhCuOVZAyWIn9bGP9cV0snWKN4H39eJJhG8a55Q2fYSn5XrkXym8ILeRUgsvy
b76HVCDxiG0bjvoPi39vjrY7cdxx1LkmgiLa1IsCgYBDdsSOF+q9vENzpH5i5jlM
p2dAbFiHlRhCNUfP0UnZYGk7RhoX4jd//RupECkMrfh5GP9BwMMdKd/phwShXqnD
PJA4sVjsDHp/JgTnFEyM1z96ROoFYecwBRj5BIT42bjlEn0YM7Dad9k+SJbQ72kX
DdYZLBP5ARAlTZ+Lzca78QKBgQC3oeruh9J5XS/JTT17h6fy4++JuZb//o/pKOtU
nevDAbkU91ACVIciK/EPUy5g0tTkxgbpPqdOIeUBvb3Y397bTrPu9cHUz1n3tkXL
49yUKrnaF1XBThOlWq5ci5HJqJyZMocWQ69Pq0GD8Dgoz9ESz8Fu5WBnxg4UcT6L
nhjODwKBgFfOlpEN1SYoO8an0s+nRHcTF+x1QQJpdkfTBTrQWvJylSfe/hdio90L
eeGQn6GHtGFbA5sw3fgIT6atMw7R/JP1PPz3pZJReaH6ZhRFSY6eT3JKHLKhNdG7
gDi9k8BeU+7EWeBLvLje4u26cSM3wX0d11FoELg5XkAD20Ir080l
-----END RSA PRIVATE KEY-----`

    const decryptCardDataFactory = require('../../app/middleware/decrypt_card_data.js')
    const decryptCardDataMiddleware = decryptCardDataFactory({
      DECRYPT_AND_OMIT_CARD_DATA: 'true',
      // The public part of this key was used in AWS cloudfront
      // under the following name / namespace to encrypt the
      // ciphertext cardNo values used in the tests:
      DECRYPT_CARD_DATA_PRIVATE_KEY: privateKey,
      DECRYPT_CARD_DATA_KEY_NAME: 'govuk-pay-test-fle-key',
      DECRYPT_CARD_DATA_KEY_NAMESPACE: 'govuk-pay-test'
    })

    const testCases = [
      {
        ciphertext: 'AYABeCbpp7uURQGgSaV1sHzOqXIAAAABAA5nb3Z1ay1wYXktdGVzdAAWZ292dWstcGF5LXRlc3QtZmxlLWtleQEAqdriIKxNiJbrmJ6FRzDi0wbrUykAzRZ/SvKR7ugqXsVhqYLognZ9QMhs5/XEPdNytY9PDTY4EhzgsMvo0Lc2Zn3Pa9k//k80iqkV5A1kSp82fqKWudFo1H1xAg6grpVEy2ii1yT9VqcbsnAcyyIO6YG8mc2SYqZEPdgtGG+/kf1Drh+WGK2x0ankzyZ7gW5qUiFwXf8H93iMFdKWWBb87wdxruLdkxBhGLTNBrQ3gh6zpF4BdBEPdvczI/owTkj77/7aYRJYa73nIoIcAcG9O3+lYXwqoBaYwR+3GxZxdgSrsZoojzrUqDElMzhGr2GpuqDBk1YxXQGCPx5q7rwhNAIAAAAADAAAEAAAAAAAAAAAAAAAAAAul44KxEnLsR3RBGzfm8oA/////wAAAAEAAAAAAAAAAAAAAAEAAAAQIVXBPSwc0i1sThz0geHQNcLr8/2yi+Z7219alUxWwPI=',
        plaintext: '4444333322221111'
      },
      {
        ciphertext: 'AYABeA0nBUcZva2i4/EZxj33xFsAAAABAA5nb3Z1ay1wYXktdGVzdAAWZ292dWstcGF5LXRlc3QtZmxlLWtleQEATjEF4pkRDvS6leR9VgiYXkzTnj5k7AuKqeQiN+vftLTU6Qxr0M84Ia2Nob9NM+sp+Zzd4GiBhc5WWM81Gk0jpZkfkT83k1Veq/beJwOSHXP9gpt7JRxPob8tI8EydsW9YOGQt/fA38se98jCVBOlsvJhWLX799Ke7eMKx59xwd/K1e069CytEoTQUZEyke9pUL0X3Q9s1IwozPSLbgtSx4o58Nt7TJMGdWJNtnJOpXB2vX+oRooGmAQTjzlyn6MPKgGZJgDgYT+gbdLepij283teeU5MrBLkPXe1/BTN2SMi9muOCPa7nKI5wN0eje38zQxt/ResCg3wlTD3eRXURwIAAAAADAAAEAAAAAAAAAAAAAAAAAD1DD+8SMKjm8RFJxB6uMen/////wAAAAEAAAAAAAAAAAAAAAEAAABIY611U0hho3TpCkqtCG9yfyyu9TZXMfKC0BHQXaDGqboGtx/c3VVfsEfG/FKrWugNiwi0Bf+6MIt2G2KSOa5OxEcVGIrh2t92bFDcXx3JGaAxmoE5V2EaLQ==',
        plaintext: 'this was encrypted using cloudfront field level encryption on 2020/02/14'
      },
      {
        ciphertext: 'AYABeAjdAgJOBfGiJkUniC1nuiQAAAABAA5nb3Z1ay1wYXktdGVzdAAWZ292dWstcGF5LXRlc3QtZmxlLWtleQEAOtndMTZOAuvGgsaLW5/dLs87iaSyxgAVwWJ/226DGpN3xeOmBeQWoKZ+t1vWOuqdN7bz/SCe4JxslWq9Uvhf1SLuYmLyVyT4jFoOFV3htmmJxc4qoOqrZA1iYKrTRHjcMpRE7ZVYufKc5nlHhxbu59ZnTtR8eK5vhLLyMxXQVW7vWWunCkxm66pApuWCbY2PjOOUfdcZH4omFXwbGTFVI5ydmm57SMySTNja99rnJ0h05OBZpJj63Xri8Lpxhdn5d9DRxGygPpW2JQCl3FFIxrrkyovTXWEOVh8sxt4z04I2DDb4RfWOpb6jioGhlva43caiJeCyuwd71tODOTaPtAIAAAAADAAAEAAAAAAAAAAAAAAAAABo6fqLc2Crq3eNAjQgV63K/////wAAAAEAAAAAAAAAAAAAAAEAAAAbkys2wcSPHprjIs/W/NiX9WCkzU2DiEaO7xYhyi3Xl1U+d+Hcl484RjXZ3w==',
        plaintext: 'GOV.UK PaaS 💕 GOV.UK Pay'
      }
    ]

    testCases.forEach((testCase, i) => {
      it(`should decrypt card data (test case ${i})`, async function () {
        const req = {
          body: {
            cardNo: testCase.ciphertext
          }
        }
        decryptCardDataMiddleware(req, {}, next)
        await next.promise
        expect(req.body.cardNo).to.eq(testCase.plaintext)
      })
    })

    it('should not decrypt non-card data', async function () {
      const req = {
        body: {
          some_thing: 'some thing',
          some_other_thing: 'some other thing',
          some_thing_else: 'some thing else'
        }
      }
      try {
        decryptCardDataMiddleware(req, {}, next)
        await next.promise
      } catch (rejection) {
        expect(rejection).to.eq('should not have happened')
      }
      expect(req.body.some_thing).to.eq('some thing')
      expect(req.body.some_other_thing).to.eq('some other thing')
      expect(req.body.some_thing_else).to.eq('some thing else')
    })
  })
})
