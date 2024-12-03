;; Carbon Offset Contract

(define-fungible-token carbon-credit)

(define-map carbon-offsets
  { user: principal }
  { amount: uint }
)

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))

(define-public (mint-carbon-credits (recipient principal) (amount uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (try! (ft-mint? carbon-credit amount recipient))
    (let
      ((current-offset (default-to { amount: u0 } (map-get? carbon-offsets { user: recipient }))))
      (map-set carbon-offsets
        { user: recipient }
        { amount: (+ (get amount current-offset) amount) }
      )
    )
    (ok true)
  )
)

(define-public (transfer-carbon-credits (amount uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender) err-owner-only)
    (try! (ft-transfer? carbon-credit amount sender recipient))
    (let
      ((sender-offset (default-to { amount: u0 } (map-get? carbon-offsets { user: sender })))
       (recipient-offset (default-to { amount: u0 } (map-get? carbon-offsets { user: recipient }))))
      (map-set carbon-offsets
        { user: sender }
        { amount: (- (get amount sender-offset) amount) }
      )
      (map-set carbon-offsets
        { user: recipient }
        { amount: (+ (get amount recipient-offset) amount) }
      )
    )
    (ok true)
  )
)

(define-read-only (get-carbon-offset (user principal))
  (default-to { amount: u0 } (map-get? carbon-offsets { user: user }))
)

(define-read-only (get-carbon-credit-balance (user principal))
  (ok (ft-get-balance carbon-credit user))
)

