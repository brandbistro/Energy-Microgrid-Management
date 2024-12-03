;; Load Balancing Contract

(define-map grid-status
  { grid-id: uint }
  {
    total-supply: uint,
    total-demand: uint,
    last-updated: uint
  }
)

(define-map user-consumption
  { user: principal, grid-id: uint }
  { amount: uint }
)

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))

(define-public (update-grid-status (grid-id uint) (supply uint) (demand uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (map-set grid-status
      { grid-id: grid-id }
      {
        total-supply: supply,
        total-demand: demand,
        last-updated: block-height
      }
    )
    (ok true)
  )
)

(define-public (report-consumption (grid-id uint) (amount uint))
  (let
    ((current-consumption (default-to { amount: u0 } (map-get? user-consumption { user: tx-sender, grid-id: grid-id })))
     (grid (unwrap! (map-get? grid-status { grid-id: grid-id }) err-not-found)))
    (map-set user-consumption
      { user: tx-sender, grid-id: grid-id }
      { amount: amount }
    )
    (map-set grid-status
      { grid-id: grid-id }
      (merge grid {
        total-demand: (+ (- (get total-demand grid) (get amount current-consumption)) amount)
      })
    )
    (ok true)
  )
)

(define-read-only (get-grid-status (grid-id uint))
  (map-get? grid-status { grid-id: grid-id })
)

(define-read-only (get-user-consumption (user principal) (grid-id uint))
  (map-get? user-consumption { user: user, grid-id: grid-id })
)
