import { Component, OnInit } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-celular',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './celular.component.html',
  styleUrls: ['./celular.component.scss']
})
export class CelularComponent implements OnInit {

  constructor(private seoService: SeoService) {}

  ngOnInit(): void {
    this.updateSeo();
  }

  private updateSeo(): void {
    this.seoService.updateTitle('Servicio Técnico de Celulares en Marcos Paz | Arecofix - Reparación en el Acto');
    this.seoService.updateDescription('¿Buscás arreglo de celulares en Marcos Paz? En Arecofix reparamos pantallas, baterías y pines de carga. Servicio técnico especializado con garantía. ¡Consultanos!');
    this.seoService.updateKeywords('reparacion de celulares marcos paz, servicio tecnico celulares marcos paz, arreglo de celulares marcos paz, arecofix');
    this.seoService.updateCanonicalUrl('https://www.arecofix.com.ar/celular');

    const schema = {
      "@context": "https://schema.org",
      "@type": "MobilePhoneRepairShop", // Specific type for LocalBusiness
      "name": "Arecofix - Servicio Técnico de Celulares",
      "image": "https://arecofix.com.ar/assets/images/logo.png", // Verify path or update later
      "url": "https://www.arecofix.com.ar/celular",
      "telephone": "+5411XXXXXXXX", // Add actual phone if known or placeholder
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Av. San Martin 123", // Placeholder
        "addressLocality": "Marcos Paz",
        "addressRegion": "Buenos Aires",
        "postalCode": "1727",
        "addressCountry": "AR"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "-34.7675", // Approximate
        "longitude": "-58.8353" // Approximate
      },
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday"
        ],
        "opens": "09:00",
        "closes": "20:00"
      },
      "priceRange": "$$"
    };
    
    this.seoService.updateSchema(schema);
  }
}
