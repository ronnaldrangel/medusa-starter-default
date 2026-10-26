import {
  AbstractFulfillmentProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceDTO,
  CreateFulfillmentResult,
  FulfillmentOption,
} from "@medusajs/framework/types"
import { packageForWeight, priceForPackage, quote } from "../../lib/shalom-client"

// La configuracion (sede central, recargo) se guarda en el `data` de la
// opcion de envio desde la pagina Shalom del admin.
type OptionData = {
  origin_ter_id?: number
  surcharge?: number
  default_weight_grams?: number
  fallback_amount?: number
}

type MethodData = {
  ter_id?: number
  agency_name?: string
  dni?: string
}

class ShalomFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = "shalom"

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [{ id: "shalom-agencia", name: "Envío a agencia Shalom" }]
  }

  async validateOption(): Promise<boolean> {
    return true
  }

  async canCalculate(): Promise<boolean> {
    return true
  }

  async validateFulfillmentData(
    _optionData: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<MethodData> {
    const { ter_id, dni } = data as MethodData
    if (!ter_id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Elige una agencia Shalom de destino")
    }
    if (!dni || !/^\d{8}$/.test(String(dni))) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Ingresa el DNI (8 dígitos) de quien recogerá el paquete"
      )
    }
    return data as MethodData
  }

  async calculatePrice(
    optionData: CalculateShippingOptionPriceDTO["optionData"],
    data: CalculateShippingOptionPriceDTO["data"],
    context: CalculateShippingOptionPriceDTO["context"]
  ): Promise<CalculatedShippingOptionPrice> {
    const {
      origin_ter_id,
      surcharge = 0,
      default_weight_grams = 1000,
      fallback_amount = 20,
    } = optionData as OptionData
    const terId = Number((data as MethodData)?.ter_id)

    // Medusa tambien calcula al listar opciones, antes de elegir agencia:
    // no se puede lanzar error ahi o se cae todo el paso de envio.
    if (!terId) {
      return { calculated_amount: 0, is_calculated_price_tax_inclusive: true }
    }
    if (!origin_ter_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Shalom no está configurado: falta la sede central de envío"
      )
    }

    // El tamano del bulto sale del peso del carrito (calculado aqui, no en el navegador).
    const grams = (context.items ?? []).reduce((sum, item: any) => {
      const weight = Number(item.variant?.weight) || default_weight_grams
      return sum + weight * Number(item.quantity ?? 1)
    }, 0)

    let base: number
    try {
      const { tariff } = await quote(Number(origin_ter_id), terId)
      base = priceForPackage(tariff, packageForWeight(grams), grams)
    } catch {
      // Si Shalom no responde no bloqueamos la compra: tarifa de respaldo.
      base = Number(fallback_amount)
    }
    const amount = base + Number(surcharge)

    return {
      calculated_amount: Math.round(amount * 100) / 100,
      // Las tarifas de Shalom ya incluyen IGV
      is_calculated_price_tax_inclusive: true,
    }
  }

  // La guia no se crea aqui: el admin aprueba cada envio en la pagina Shalom.
  async createFulfillment(data: Record<string, unknown>): Promise<CreateFulfillmentResult> {
    return { data, labels: [] }
  }

  async cancelFulfillment(): Promise<any> {
    return {}
  }

  async createReturnFulfillment(): Promise<CreateFulfillmentResult> {
    return { data: {}, labels: [] }
  }
}

export default ShalomFulfillmentProviderService
